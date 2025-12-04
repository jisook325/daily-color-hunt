/**
 * 개선된 앱 초기화
 * - UUID 기반 세션 관리
 * - IndexedDB 즉시 커밋
 * - visibilitychange 안전 저장
 * - Object URL 메모리 관리
 */

import { initializeSession, loadSessionState } from '/static/modules/session-manager.js';
import { registerSafeStore } from '/static/modules/safe-store.js';
import { loadPhotosFromIndexedDB } from '/static/modules/photo-capture.js';

let currentSessionId = null;
let currentSessionData = null;
let currentPhotos = [];

export async function initApp() {
  console.log('🚀 [Init] Starting improved app initialization...');
  
  // 1️⃣ UUID 기반 세션 초기화
  currentSessionId = initializeSession();
  
  // 2️⃣ IndexedDB에서 세션 상태 로드
  currentSessionData = await loadSessionState(currentSessionId);
  
  // 3️⃣ IndexedDB에서 사진들 로드
  currentPhotos = await loadPhotosFromIndexedDB(currentSessionId);
  
  console.log(`✅ [Init] Session loaded: ${currentSessionId}`);
  console.log(`✅ [Init] Photos loaded: ${currentPhotos.length}`);
  
  // 4️⃣ SafeStore 등록 (visibilitychange 대응)
  registerSafeStore(currentSessionData, currentPhotos);
  
  // 5️⃣ 전역 상태 노출 (기존 코드 호환성)
  window.__SESSION_ID__ = currentSessionId;
  window.__SESSION_DATA__ = currentSessionData;
  window.__PHOTOS__ = currentPhotos;
  
  console.log('✅ [Init] App initialization complete');
  
  return {
    sessionId: currentSessionId,
    sessionData: currentSessionData,
    photos: currentPhotos
  };
}

// Export for external use
export function getCurrentSessionId() {
  return currentSessionId;
}

export function getCurrentPhotos() {
  return currentPhotos;
}

export function addPhoto(photoData) {
  currentPhotos.push(photoData);
  registerSafeStore(currentSessionData, currentPhotos);
}
