import { flushToIndexedDB } from '/static/modules/db.js';

/**
 * iOS Safari 탭 전환 시 메모리 해제 방지
 * visibilitychange와 pagehide 이벤트로 안전하게 저장
 */

let currentSessionData = null;
let currentPhotosArray = [];

export function registerSafeStore(sessionData, photosArray) {
  currentSessionData = sessionData;
  currentPhotosArray = photosArray;
}

async function flush() {
  if (!currentSessionData) {
    console.log('⚠️ No session data to flush');
    return;
  }
  
  console.log('💾 [SafeStore] Flushing to IndexedDB...');
  console.log('   Session:', currentSessionData.id);
  console.log('   Photos:', currentPhotosArray.length);
  
  try {
    await flushToIndexedDB(currentSessionData, currentPhotosArray);
    console.log('✅ [SafeStore] Flush complete');
  } catch (error) {
    console.error('❌ [SafeStore] Flush failed:', error);
  }
}

// visibilitychange: 탭 전환 감지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('👁️ [SafeStore] Tab hidden - flushing data');
    flush();
  } else {
    console.log('👁️ [SafeStore] Tab visible');
  }
});

// pagehide: 페이지 언로드 직전 (iOS Safari 중요)
window.addEventListener('pagehide', (event) => {
  console.log('🚪 [SafeStore] Page hide - flushing data', event.persisted);
  flush();
});

// beforeunload: 추가 안전장치
window.addEventListener('beforeunload', () => {
  console.log('⚠️ [SafeStore] Before unload - flushing data');
  flush();
});

console.log('✅ SafeStore initialized');
