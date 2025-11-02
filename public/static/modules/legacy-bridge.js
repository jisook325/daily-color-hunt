/**
 * 기존 Vanilla JS 코드와 새 모듈 시스템 간의 브릿지
 * 기존 app.js의 전역 변수/함수와 호환성 유지
 */

import { initApp, getCurrentSessionId, getCurrentPhotos, addPhoto, clearSession, reinitializeSession } from '/static/modules/init.js';
import { capturePhotoToIndexedDB, loadPhotosFromIndexedDB } from '/static/modules/photo-capture.js';
import { db, cleanupSession } from '/static/modules/db.js';
import { markSessionComplete, startNewSession } from '/static/modules/session-manager.js';

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

// 세션 정리 (새 컬러 시작 시 사용)
export async function cleanupCurrentSession() {
  const sessionId = getCurrentSessionId();
  if (sessionId) {
    console.log('🧹 [Bridge] Cleaning up current session:', sessionId);
    await cleanupSession(sessionId);
    clearSession(); // 메모리 상태도 정리
    console.log('✅ [Bridge] Session cleanup complete');
  } else {
    console.log('⚠️ [Bridge] No active session to cleanup');
  }
}

// 새 세션 시작 (새 컬러를 받았을 때)
export async function startNewColorSession() {
  console.log('🆕 [Bridge] Starting new color session...');
  
  // 1. 이전 세션 정리
  await cleanupCurrentSession();
  
  // 2. 새 UUID 생성 및 URL 업데이트
  const newSessionId = startNewSession();
  
  // 3. 개선된 시스템 재초기화
  const result = await reinitializeSession(newSessionId);
  
  console.log('✅ [Bridge] New color session started:', newSessionId);
  return result;
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
    cleanupSession: cleanupCurrentSession,
    startNewSession: startNewColorSession,
    debug: debugInfo
  };
}
