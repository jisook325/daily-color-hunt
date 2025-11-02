// Dexie는 CDN에서 전역으로 로드됨
const Dexie = window.Dexie;

if (!Dexie) {
  throw new Error('Dexie not loaded from CDN');
}

export const db = new Dexie('daily-color-hunt');

db.version(1).stores({
  photos: 'id,sessionId,createdAt,position',
  sessions: 'id,status,updatedAt,color'
});

// Helper functions
export async function savePhotoToIndexedDB(photoData) {
  const { id, sessionId, blob, position, createdAt } = photoData;
  
  // 데이터베이스 상태 확인
  if (!db.isOpen()) {
    console.warn('⚠️ Database is not open, attempting to open...');
    await db.open();
  }
  
  await db.photos.put({
    id,
    sessionId,
    blob,
    position,
    createdAt: createdAt || Date.now()
  });
  
  console.log('📸 Photo saved to IndexedDB:', id, 'position:', position);
  console.log('sessionId', sessionId);
  
  // 진단 로깅: DB 전체 상태 확인
  const all = await db.photos.toArray();
  console.log('DB count after capture', all.length);
  console.log('📊 All photos in DB:', all.map(p => ({ id: p.id, pos: p.position, session: p.sessionId })));
}

export async function getSessionPhotos(sessionId) {
  console.log('🔍 Loading photos for sessionId:', sessionId);
  const photos = await db.photos.where('sessionId').equals(sessionId).sortBy('position');
  console.log('📊 IndexedDB photo count:', photos.length);
  return photos;
}

export async function getCurrentSession(sessionId) {
  const session = await db.sessions.get(sessionId);
  if (session) {
    console.log('✅ Session found in IndexedDB:', sessionId);
  } else {
    console.log('❌ Session not found in IndexedDB:', sessionId);
  }
  return session;
}

export async function saveSession(sessionData) {
  const { id, status, color, updatedAt } = sessionData;
  await db.sessions.put({
    id,
    status: status || 'in_progress',
    color,
    updatedAt: updatedAt || Date.now()
  });
  console.log('💾 Session saved to IndexedDB:', id, 'status:', status || 'in_progress');
}

// Flush current in-memory data to IndexedDB (for visibilitychange)
export async function flushToIndexedDB(currentSessionData, photosArray) {
  if (!currentSessionData?.id) return;
  
  console.log('🔄 Flushing to IndexedDB...');
  
  // Save session
  await saveSession(currentSessionData);
  
  // Save all photos
  for (const photo of photosArray) {
    if (photo.blob) {
      await savePhotoToIndexedDB(photo);
    }
  }
  
  console.log('✅ Flush complete');
}

/**
 * 특정 세션의 모든 사진 삭제
 * @param {string} sessionId - 삭제할 세션 ID
 */
export async function deleteSessionPhotos(sessionId) {
  if (!sessionId) {
    console.warn('⚠️ deleteSessionPhotos: sessionId is required');
    return;
  }
  
  console.log('🗑️ [DB] Deleting all photos for session:', sessionId);
  
  const photosToDelete = await db.photos.where('sessionId').equals(sessionId).toArray();
  console.log('📊 [DB] Found', photosToDelete.length, 'photos to delete');
  
  await db.photos.where('sessionId').equals(sessionId).delete();
  
  console.log('✅ [DB] Session photos deleted:', sessionId);
}

/**
 * 특정 세션 삭제
 * @param {string} sessionId - 삭제할 세션 ID
 */
export async function deleteSession(sessionId) {
  if (!sessionId) {
    console.warn('⚠️ deleteSession: sessionId is required');
    return;
  }
  
  console.log('🗑️ [DB] Deleting session:', sessionId);
  
  await db.sessions.delete(sessionId);
  
  console.log('✅ [DB] Session deleted:', sessionId);
}

/**
 * 완전한 세션 정리 (세션 + 사진)
 * @param {string} sessionId - 정리할 세션 ID
 */
export async function cleanupSession(sessionId) {
  if (!sessionId) {
    console.warn('⚠️ cleanupSession: sessionId is required');
    return;
  }
  
  console.log('🧹 [DB] Cleaning up session:', sessionId);
  
  // 사진 먼저 삭제
  await deleteSessionPhotos(sessionId);
  
  // 세션 메타데이터 삭제
  await deleteSession(sessionId);
  
  // 전체 상태 확인
  const remainingPhotos = await db.photos.count();
  const remainingSessions = await db.sessions.count();
  
  console.log('✅ [DB] Cleanup complete. Remaining:', remainingPhotos, 'photos,', remainingSessions, 'sessions');
}

// 전역 접근 가능하도록 노출 (디버깅용)
if (typeof window !== 'undefined') {
  window.db = db;
  console.log('[BOOT] Dexie ready');
  console.log('✅ [Debug] window.db is now available for debugging');
}
