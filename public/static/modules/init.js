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

// 세션 메모리 정리 (새 세션 시작 시 사용)
export function clearSession() {
  console.log('🧹 [Init] Clearing session from memory');
  currentSessionId = null;
  currentSessionData = null;
  currentPhotos = [];
  
  // 전역 상태도 정리
  if (typeof window !== 'undefined') {
    window.__SESSION_ID__ = null;
    window.__SESSION_DATA__ = null;
    window.__PHOTOS__ = [];
  }
  
  console.log('✅ [Init] Session cleared from memory');
}

/**
 * 새 세션으로 재초기화 (새 컬러를 받았을 때)
 * @param {string} newSessionId - 새로 생성된 세션 ID
 */
export async function reinitializeSession(newSessionId) {
  console.log('🔄 [Init] Reinitializing with new session:', newSessionId);
  
  // 기존 세션 정리
  clearSession();
  
  // 새 세션 ID 설정
  currentSessionId = newSessionId;
  
  // IndexedDB에서 새 세션 상태 로드
  const { loadSessionState } = await import('/static/modules/session-manager.js');
  currentSessionData = await loadSessionState(newSessionId);
  
  // 사진 목록 초기화 (빈 배열)
  currentPhotos = [];
  
  // 전역 상태 업데이트
  if (typeof window !== 'undefined') {
    window.__SESSION_ID__ = newSessionId;
    window.__SESSION_DATA__ = currentSessionData;
    window.__PHOTOS__ = [];
  }
  
  console.log('✅ [Init] Session reinitialized:', newSessionId);
  console.log('sessionId', newSessionId);
  
  return {
    sessionId: newSessionId,
    sessionData: currentSessionData,
    photos: []
  };
}
