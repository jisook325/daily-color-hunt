// 초단순 사진 촬영 함수 - 프리징 방지
function simpleCapturePhoto(position) {
  console.log(`📸 SIMPLE capture start - position: ${position}`);
  
  // 즉시 로딩 표시
  showLoading('Taking photo...');
  
  setTimeout(() => {
    try {
      const video = document.getElementById('cameraPreview');
      const canvas = document.getElementById('captureCanvas');
      
      if (!video || !canvas || video.videoWidth === 0) {
        console.error('❌ Elements not ready');
        hideLoading();
        showError('Camera not ready');
        return;
      }
      
      console.log('✅ Elements ready, capturing...');
      
      // 캔버스에 그리기
      const ctx = canvas.getContext('2d');
      const size = Math.min(video.videoWidth, video.videoHeight);
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      
      canvas.width = 800;
      canvas.height = 800;
      ctx.drawImage(video, x, y, size, size, 0, 0, 800, 800);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      
      // 썸네일
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 200;
      thumbCanvas.height = 200;
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.drawImage(video, x, y, size, size, 0, 0, 200, 200);
      const thumbnailData = thumbCanvas.toDataURL('image/jpeg', 0.8);
      
      console.log('✅ Images created, sending to server...');
      
      // 서버 전송
      simpleSavePhoto(position, imageData, thumbnailData);
      
    } catch (error) {
      console.error('❌ Capture error:', error);
      hideLoading();
      showError('Capture failed');
    }
  }, 100);
}

// 초단순 저장 함수
async function simpleSavePhoto(position, imageData, thumbnailData) {
  try {
    console.log('💾 Saving to server...');
    
    const sessionId = currentSession?.sessionId || currentSession?.id;
    const response = await axios.post('/api/photo/add', {
      sessionId: sessionId,
      position: position,
      imageData: imageData,
      thumbnailData: thumbnailData
    });
    
    console.log('✅ Server save success');
    
    // UI 업데이트
    const slot = document.getElementById(`slot-${position}`);
    if (slot) {
      slot.innerHTML = `<img src="${thumbnailData}" alt="Photo ${position}">`;
      slot.classList.add('filled');
    }
    
    hideLoading();
    showSuccess('Photo saved');
    
    // 카메라 정리 (지연)
    setTimeout(() => {
      stopCamera();
      closeCameraView();
    }, 500);
    
  } catch (error) {
    console.error('❌ Save error:', error);
    hideLoading();
    showError('Save failed');
    
    // 실패해도 카메라 정리
    setTimeout(() => {
      stopCamera();
      closeCameraView();
    }, 1000);
  }
}