import { db, savePhotoToIndexedDB } from '/static/modules/db.js';

/**
 * 개선된 사진 촬영 시스템
 * - toBlob()로 Blob 생성
 * - IndexedDB에 즉시 저장
 * - URL.createObjectURL()로 썸네일 관리
 */

// 활성 Object URLs 추적 (메모리 누수 방지)
const activeObjectURLs = new Map();

export async function capturePhotoToIndexedDB(position, video, sessionId) {
  console.log(`📸 [Capture] Starting for position ${position}`);
  
  if (!video || video.videoWidth === 0) {
    throw new Error('Video not ready');
  }
  
  // Canvas 준비
  const canvas = document.createElement('canvas');
  const size = Math.min(video.videoWidth, video.videoHeight);
  const x = (video.videoWidth - size) / 2;
  const y = (video.videoHeight - size) / 2;
  
  // 800x800 원본 생성
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, x, y, size, size, 0, 0, 800, 800);
  
  // Blob 생성 (더 효율적)
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
  
  console.log(`✅ [Capture] Blob created: ${Math.round(blob.size / 1024)}KB`);
  
  // 썸네일 생성
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 200;
  thumbCanvas.height = 200;
  const thumbCtx = thumbCanvas.getContext('2d');
  thumbCtx.drawImage(video, x, y, size, size, 0, 0, 200, 200);
  
  const thumbnailBlob = await new Promise(resolve => {
    thumbCanvas.toBlob(resolve, 'image/jpeg', 0.8);
  });
  
  console.log(`✅ [Capture] Thumbnail created: ${Math.round(thumbnailBlob.size / 1024)}KB`);
  
  // UUID 생성
  const id = crypto.randomUUID();
  
  // IndexedDB에 즉시 저장
  await savePhotoToIndexedDB({
    id,
    sessionId,
    blob: thumbnailBlob, // 썸네일만 IndexedDB에 (용량 절약)
    position,
    createdAt: Date.now()
  });
  
  console.log('sessionId', sessionId);
  console.log('📊 IndexedDB photo count:', await db.photos.count());
  
  // Object URL 생성 (썸네일 표시용)
  const thumbnailURL = URL.createObjectURL(thumbnailBlob);
  console.log('Creating URL for', id);
  
  // 정리 함수 반환
  const cleanup = () => {
    if (activeObjectURLs.has(id)) {
      console.log('Revoking URL for', id);
      URL.revokeObjectURL(activeObjectURLs.get(id));
      activeObjectURLs.delete(id);
      console.log(`🧹 [Cleanup] Object URL revoked for ${id}`);
    }
  };
  
  // 활성 URL 추적
  activeObjectURLs.set(id, thumbnailURL);
  
  return {
    id,
    position,
    thumbnailURL,
    thumbnailBlob,
    blob, // 원본 (서버 업로드용)
    cleanup
  };
}

/**
 * IndexedDB에서 사진 로드 및 Object URL 생성
 */
export async function loadPhotosFromIndexedDB(sessionId) {
  console.log(`📂 [Load] Loading photos for session: ${sessionId}`);
  
  // 데이터베이스 상태 확인
  if (!db.isOpen()) {
    console.warn('⚠️ Database is not open during load, attempting to open...');
    await db.open();
  }
  
  const photos = await db.photos
    .where('sessionId')
    .equals(sessionId)
    .sortBy('position');
  
  console.log(`📊 IndexedDB photo count: ${photos.length}`);
  console.log('Current thumbnails in DOM:', document.querySelectorAll('.unlimited-photo-slot.filled').length);
  console.log('Rendering gallery with', photos.length, 'photos'); // 디버깅 로그
  
  const photoData = [];
  
  for (const photo of photos) {
    if (photo.blob) {
      const url = URL.createObjectURL(photo.blob);
      console.log('Creating URL for', photo.id, 'position:', photo.position);
      activeObjectURLs.set(photo.id, url);
      
      photoData.push({
        id: photo.id,
        position: photo.position,
        thumbnailURL: url,
        blob: photo.blob,
        createdAt: photo.createdAt,
        cleanup: () => {
          if (activeObjectURLs.has(photo.id)) {
            URL.revokeObjectURL(activeObjectURLs.get(photo.id));
            activeObjectURLs.delete(photo.id);
          }
        }
      });
    }
  }
  
  console.log(`✅ [Load] ${photoData.length} photos loaded with Object URLs`);
  return photoData;
}

/**
 * 모든 Object URL 정리
 */
export function cleanupAllObjectURLs() {
  console.log(`🧹 [Cleanup] Revoking ${activeObjectURLs.size} Object URLs`);
  
  for (const [id, url] of activeObjectURLs.entries()) {
    URL.revokeObjectURL(url);
  }
  
  activeObjectURLs.clear();
  console.log('✅ [Cleanup] All Object URLs revoked');
}

// 페이지 언로드 시 자동 정리
window.addEventListener('beforeunload', cleanupAllObjectURLs);
