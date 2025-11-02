/**
 * 개선된 앱 진입점
 * 기존 app.js와 함께 로드되어 개선된 기능 제공
 */

import '/static/modules/safe-store.js'; // 자동 초기화
import { initializeImprovedSystem, capturePhotoImproved } from '/static/modules/legacy-bridge.js';
import { db } from '/static/modules/db.js'; // Dexie 인스턴스 import

console.log('[BOOT] app-improved loaded');
console.log('📦 [Improved] Loading improved system modules...');

// 전역 디버깅 접근 (즉시 노출)
if (typeof window !== 'undefined') {
  window.db = db;
  window.__IMPROVED_SYSTEM__ = window.__IMPROVED_SYSTEM__ || {};
  window.__IMPROVED_SYSTEM__.loaded = true;
  console.log('[BOOT] window.db and __IMPROVED_SYSTEM__ exposed');
  console.log('✅ [Debug] window.db exposed for debugging');
}

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await initImproved();
  });
} else {
  initImproved();
}

async function initImproved() {
  console.log('🚀 [Improved] Initializing improved system...');
  
  try {
    const result = await initializeImprovedSystem();
    console.log('✅ [Improved] System initialized:', result);
    
    // 기존 capturePhoto 함수를 개선된 버전으로 오버라이드
    if (typeof window.capturePhoto === 'function') {
      const originalCapturePhoto = window.capturePhoto;
      
      window.capturePhoto = async function(position) {
        console.log('📸 [Improved] Using improved capture system for position', position);
        
        try {
          // 1️⃣ 사진 촬영 및 IndexedDB 저장
          const photoData = await capturePhotoImproved(position);
          console.log('✅ [Improved] Photo captured and saved:', photoData.id);
          
          // 2️⃣ 카메라 정리 및 화면 전환
          if (typeof window.stopCamera === 'function') {
            window.stopCamera();
          }
          
          if (typeof window.closeCameraView === 'function') {
            requestAnimationFrame(() => {
              window.closeCameraView();
            });
          }
          
          // 3️⃣ 모든 사진 다시 로드하여 갤러리 렌더링 (CRITICAL FIX)
          setTimeout(async () => {
            try {
              const allPhotos = await window.__IMPROVED_SYSTEM__.getPhotos();
              console.log('🔄 [Improved] Reloading all photos after capture:', allPhotos.length);
              
              // 모든 사진 렌더링
              allPhotos.forEach(photo => {
                const slot = document.getElementById(`slot-${photo.position}`);
                if (slot && photo.thumbnailURL) {
                  slot.innerHTML = `<img src="${photo.thumbnailURL}" alt="Photo ${photo.position}">`;
                  slot.classList.add('filled');
                  slot.setAttribute('data-photo-id', photo.id);
                  console.log(`✅ [Improved] Slot ${photo.position} rendered`);
                }
              });
              
              // photoCount 업데이트 (기존 코드 호환성)
              if (typeof window.photoCount !== 'undefined') {
                window.photoCount = allPhotos.length;
              }
              if (typeof window.updateProgress === 'function') {
                window.updateProgress();
              }
              
              console.log('✅ [Improved] Gallery re-rendered with', allPhotos.length, 'photos');
            } catch (error) {
              console.error('❌ [Improved] Failed to reload gallery:', error);
            }
          }, 200);
          
          // 성공 토스트
          if (typeof window.showSuccess === 'function') {
            window.showSuccess('Photo saved');
          }
          
          return photoData;
          
        } catch (error) {
          console.error('❌ [Improved] Capture failed:', error);
          
          // 기존 함수로 폴백
          console.log('⚠️ [Improved] Falling back to original capture');
          return originalCapturePhoto.call(this, position);
        }
      };
      
      console.log('✅ [Improved] capturePhoto() function overridden');
    }
    
  } catch (error) {
    console.error('❌ [Improved] Initialization failed:', error);
  }
}

// 전역 디버그 함수
window.debugImprovedSystem = async () => {
  if (window.__IMPROVED_SYSTEM__) {
    return await window.__IMPROVED_SYSTEM__.debug();
  }
  return { error: 'System not initialized' };
};

console.log('✅ [Improved] Module loaded. Call debugImprovedSystem() for info.');
