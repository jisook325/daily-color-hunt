/**
 * 개선된 앱 진입점
 * 기존 app.js와 함께 로드되어 개선된 기능 제공
 */

import './safe-store.js'; // 자동 초기화
import { initializeImprovedSystem, capturePhotoImproved } from './legacy-bridge.js';

console.log('📦 [Improved] Loading improved system modules...');

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
        console.log('📸 [Improved] Using improved capture system');
        
        try {
          const photoData = await capturePhotoImproved(position);
          
          // UI 업데이트 (썸네일 표시)
          setTimeout(() => {
            const slot = document.getElementById(`slot-${position}`);
            if (slot && photoData.thumbnailURL) {
              slot.innerHTML = `<img src="${photoData.thumbnailURL}" alt="Photo ${position}">`;
              slot.classList.add('filled');
              slot.setAttribute('data-photo-id', photoData.id);
              console.log(`✅ [Improved] Slot ${position} updated with Object URL`);
            }
          }, 100);
          
          // 카메라 정리 및 화면 전환
          if (typeof window.stopCamera === 'function') {
            window.stopCamera();
          }
          
          if (typeof window.closeCameraView === 'function') {
            requestAnimationFrame(() => {
              window.closeCameraView();
            });
          }
          
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
