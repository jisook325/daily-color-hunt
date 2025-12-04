/**
 * 기존 Vanilla JS 코드와 새 모듈 시스템 간의 브릿지
 * 기존 app.js의 전역 변수/함수와 호환성 유지
 */

import { initApp, getCurrentSessionId, getCurrentPhotos, addPhoto } from '/static/modules/init.js';
import { capturePhotoToIndexedDB, loadPhotosFromIndexedDB } from '/static/modules/photo-capture.js';
import { db } from '/static/modules/db.js';
import { markSessionComplete } from '/static/modules/session-manager.js';

// 기존 코드가 기대하는 전역 함수들을 export
export async function initializeImprovedSystem() {
  console.log('🌉 [Bridge] Initializing improved system...');
  
  const result = await initApp();
  
  console.log('✅ [Bridge] System ready');
  return result;
}

// 기존 capturePhoto 함수를 대체할 함수
export async function capturePhotoImproved(position) {
  console.log(`📸 [Bridge] Capturing photo at position ${position}`);
  
  const video = document.getElementById('cameraPreview');
  if (!video) {
    throw new Error('Video element not found');
  }
  
  const sessionId = getCurrentSessionId();
  if (!sessionId) {
    throw new Error('No active session');
  }
  
  console.log('Saving photo', { position, sessionId }); // 디버깅 로그
  
  try {
    // 개선된 캡처 시스템 사용
    const photoData = await capturePhotoToIndexedDB(position, video, sessionId);
    
    console.log('✅ [Bridge] Photo captured:', photoData.id, 'sessionId:', sessionId);
    
    // 전역 상태에 추가
    addPhoto(photoData);
    
    return photoData;
  } catch (error) {
    console.error('❌ [Bridge] Capture failed:', error);
    throw error;
  }
}

// 세션 완료 처리
export async function completeSession() {
  const sessionId = getCurrentSessionId();
  if (sessionId) {
    await markSessionComplete(sessionId);
    console.log('✅ [Bridge] Session marked as complete');
  }
}

// 사진 목록 가져오기
export async function getSessionPhotos() {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return [];
  
  return await loadPhotosFromIndexedDB(sessionId);
}

// 디버깅용
export async function debugInfo() {
  const sessionId = getCurrentSessionId();
  const photos = getCurrentPhotos();
  const photoCount = await db.photos.count();
  
  console.log('🐛 [Debug] Current state:');
  console.log('   Session ID:', sessionId);
  console.log('   Photos in memory:', photos.length);
  console.log('   Photos in IndexedDB:', photoCount);
  
  return {
    sessionId,
    memoryPhotos: photos.length,
    dbPhotos: photoCount
  };
}

// 전역 window에 노출 (기존 코드 호환)
if (typeof window !== 'undefined') {
  window.__IMPROVED_SYSTEM__ = {
    initialize: initializeImprovedSystem,
    capturePhoto: capturePhotoImproved,
    completeSession,
    getPhotos: getSessionPhotos,
    debug: debugInfo
  };
}
