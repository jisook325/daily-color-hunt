// Color Hunt - 메인 애플리케이션

// 전역 상태
let currentUser = null;
let currentSession = null;
let currentColor = null;
let photoCount = 0;
let mediaStream = null;

// 컬러 정보
const COLORS = {
  red: { hex: '#FFB3B3', english: 'Soft Coral', korean: '빨강' },
  orange: { hex: '#FFCC99', english: 'Warm Peach', korean: '주황' },
  yellow: { hex: '#FFF2CC', english: 'Cream Yellow', korean: '노랑' },
  green: { hex: '#C6E2C7', english: 'Sage Green', korean: '초록' },
  blue: { hex: '#B3D3FF', english: 'Sky Blue', korean: '파랑' },
  indigo: { hex: '#C7B3EB', english: 'Lavender', korean: '남색' },
  purple: { hex: '#E0B3FF', english: 'Soft Violet', korean: '보라' },
  white: { hex: '#FEFEFE', english: 'Off White', korean: '흰색' },
  black: { hex: '#2D2D2D', english: 'Charcoal', korean: '검정' }
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎨 Color Hunt 앱 시작!');
  
  // 사용자 ID 생성 또는 로드
  currentUser = getUserId();
  
  // 메인 컨테이너 설정
  const app = document.getElementById('app');
  if (!app) {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center p-8">
          <h1 class="text-4xl font-bold mb-6">🎨 Color Hunt</h1>
          <p class="text-gray-600 mb-8">오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!</p>
          <div id="app"></div>
        </div>
      </div>
    `;
  }
  
  // 현재 세션 확인 후 적절한 화면 표시
  checkCurrentSession();
});

// 사용자 ID 관리
function getUserId() {
  let userId = localStorage.getItem('colorhunt_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('colorhunt_user_id', userId);
  }
  return userId;
}

// 현재 세션 확인
async function checkCurrentSession() {
  try {
    showLoading('세션 확인 중...');
    
    const response = await axios.get(`/api/session/current/${currentUser}`);
    const { session } = response.data;
    
    hideLoading();
    
    if (session && session.status === 'in_progress') {
      // 진행 중인 세션이 있으면 콜라주 화면으로
      currentSession = session;
      currentColor = session.color;
      photoCount = session.photos?.length || 0;
      showCollageScreen();
    } else {
      // 새로운 컬러 선택 화면으로
      showColorSelectionScreen();
    }
  } catch (error) {
    console.error('세션 확인 오류:', error);
    hideLoading();
    showColorSelectionScreen();
  }
}

// 컬러 선택 화면
function showColorSelectionScreen() {
  // 배경색 초기화 (기본 회색)
  document.body.style.backgroundColor = '#F9FAFB';
  document.body.style.color = '#374151';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in p-4">
      <h2 class="text-2xl font-bold mb-6">What's Today's Color?</h2>
      <p class="text-gray-600 mb-8">Discover a new color and start taking photos!</p>
      
      <button onclick="getNewColor()" class="btn btn-primary mb-4">
        <i class="fas fa-palette mr-2"></i>
        Get New Color
      </button>
      
      <div class="mt-8">
        <button onclick="showHistoryScreen()" class="btn btn-secondary">
          <i class="fas fa-history mr-2"></i>
          My Collages
        </button>
      </div>
    </div>
  `;
}

// 새로운 컬러 받기
async function getNewColor(excludeColor = null) {
  try {
    showLoading('Finding new color...');
    
    const response = await axios.post('/api/color/new', {
      userId: currentUser,
      excludeColor: excludeColor
    });
    
    const { color, date } = response.data;
    currentColor = color.name;
    
    // GA 이벤트 추적
    trackEvent('color_selected', {
      color_name: color.name,
      color_korean: color.korean,
      is_retry: !!excludeColor
    });
    
    hideLoading();
    showColorConfirmationScreen(color, date);
    
  } catch (error) {
    console.error('Color fetch error:', error);
    hideLoading();
    showError('Failed to fetch color.');
  }
}

// 컬러 확인 화면
function showColorConfirmationScreen(color, date) {
  const colorInfo = COLORS[color.name];
  const isLightColor = ['yellow', 'white'].includes(color.name);
  
  // 전체 배경색 변경
  document.body.style.backgroundColor = colorInfo.hex;
  document.body.style.transition = 'background-color 0.5s ease';
  
  // 텍스트 색상 결정 (밝은 배경이면 어두운 텍스트, 어두운 배경이면 밝은 텍스트)
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  const buttonStyle = isLightColor ? 'dark' : 'light';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in p-4" style="color: ${textColor}">
      <p class="text-sm mb-4 opacity-70">${date}</p>
      <p class="text-lg mb-4">Today's color is</p>
      
      <div class="mb-8">
        <h2 class="text-4xl font-bold mb-2">${colorInfo.english}</h2>
        <p class="text-lg opacity-80">${color.name.toUpperCase()}</p>
      </div>
      
      <div class="mt-8 space-y-4">
        <button onclick="confirmColor()" class="btn btn-${buttonStyle} w-full">
          <i class="fas fa-check mr-2"></i>
          Confirm
        </button>
        <button onclick="getNewColor('${color.name}')" class="btn btn-outline-${buttonStyle} w-full">
          <i class="fas fa-refresh mr-2"></i>
          Get Another Color
        </button>
      </div>
    </div>
  `;
}

// 컬러 확인 후 세션 시작
async function confirmColor() {
  try {
    showLoading('Starting session...');
    
    const response = await axios.post('/api/session/start', {
      userId: currentUser,
      color: currentColor
    });
    
    currentSession = response.data;
    photoCount = 0;
    
    // GA 이벤트 추적
    trackEvent('session_started', {
      color_name: currentColor,
      session_id: response.data.sessionId
    });
    
    hideLoading();
    showCollageScreen();
    
  } catch (error) {
    console.error('Session start error:', error);
    hideLoading();
    showError('Failed to start session.');
  }
}

// 콜라주 촬영 화면
function showCollageScreen() {
  const colorInfo = COLORS[currentColor];
  const progress = Math.round((photoCount / 9) * 100);
  
  // 배경색 유지
  if (document.body.style.backgroundColor !== colorInfo.hex) {
    document.body.style.backgroundColor = colorInfo.hex;
    document.body.style.transition = 'background-color 0.5s ease';
  }
  
  // 텍스트 색상 결정
  const isLightColor = ['yellow', 'white'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  const buttonStyle = isLightColor ? 'dark' : 'light';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="animate-fade-in p-4 text-center" style="color: ${textColor}">
      <!-- 헤더 -->
      <div class="mb-6">
        <h2 class="text-xl font-bold mb-2">
          Find ${colorInfo.english}
        </h2>
        <p class="text-sm opacity-70 mb-2">${photoCount}/9 completed</p>
        
        <!-- 프로그레스 바 -->
        <div class="progress-bar bg-black bg-opacity-20 rounded-full h-2 w-full mb-4">
          <div class="progress-fill bg-white bg-opacity-80 h-full rounded-full transition-all duration-300" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <!-- 사진 그리드 -->
      <div class="color-grid mb-6 mx-auto" id="photoGrid" style="max-width: 300px;">
        ${generateSequentialPhotoGrid()}
      </div>
      
      <!-- 하단 버튼들 -->
      <div class="space-y-3">
        ${photoCount === 9 ? `
          <button onclick="completeCollage()" class="btn btn-${buttonStyle} w-full">
            <i class="fas fa-save mr-2"></i>
            Complete Collage
          </button>
        ` : `
          <button onclick="openCamera()" class="btn btn-${buttonStyle} w-full">
            <i class="fas fa-camera mr-2"></i>
            Take Photo ${photoCount + 1}
          </button>
        `}
        
        <div class="flex gap-2">
          <button onclick="showPreview()" class="btn btn-outline-${buttonStyle} flex-1">
            <i class="fas fa-eye mr-2"></i>
            Preview
          </button>
          <button onclick="showHistoryScreen()" class="btn btn-outline-${buttonStyle} flex-1">
            <i class="fas fa-history mr-2"></i>
            History
          </button>
        </div>
        
        <button onclick="resetSession()" class="btn btn-muted w-full opacity-60 hover:opacity-80 transition-opacity" style="background-color: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3);">
          <i class="fas fa-redo mr-2"></i>
          Start Over
        </button>
      </div>
    </div>
  `;
  
  // 기존 사진 데이터 로드
  if (currentSession && currentSession.photos) {
    loadExistingPhotos();
  }
}

// 순차적 사진 그리드 생성 (카메라 아이콘은 다음 빈 슬롯에만)
function generateSequentialPhotoGrid() {
  let gridHTML = '';
  let nextEmptySlot = photoCount + 1; // 다음 촬영할 슬롯 번호
  
  for (let i = 1; i <= 9; i++) {
    const showCamera = (i === nextEmptySlot && i <= 9);
    gridHTML += `
      <div class="photo-slot" id="slot-${i}" onclick="handleSlotClick(${i})">
        ${showCamera ? '<i class="fas fa-camera camera-icon"></i>' : ''}
      </div>
    `;
  }
  return gridHTML;
}

// 기존 함수 유지 (호환성을 위해)
function generatePhotoGrid() {
  return generateSequentialPhotoGrid();
}

// 기존 사진 로드
function loadExistingPhotos() {
  if (!currentSession.photos) return;
  
  currentSession.photos.forEach(photo => {
    const slot = document.getElementById(`slot-${photo.position}`);
    if (slot && photo.thumbnail_data) {
      slot.innerHTML = `<img src="${photo.thumbnail_data}" alt="Photo ${photo.position}">`;
      slot.classList.add('filled');
      slot.setAttribute('data-photo-id', photo.id);
    }
  });
  
  // 사진 개수 재계산
  photoCount = recalculatePhotoCount();
  updateProgress();
}

// 슬롯 클릭 처리 (순차적 촬영)
function handleSlotClick(position) {
  const slot = document.getElementById(`slot-${position}`);
  
  if (slot.classList.contains('filled')) {
    // 이미 있는 사진 - 크게 보기
    showPhotoDetail(position);
  } else {
    // 빈 슬롯 - 순차적 촬영만 허용
    const nextSlot = photoCount + 1;
    if (position === nextSlot) {
      openCameraForPosition(position);
    } else {
      showToast(`Please take photos in order. Take photo ${nextSlot} first.`, 'info');
    }
  }
}

// 사진 상세 보기
function showPhotoDetail(position) {
  const slot = document.getElementById(`slot-${position}`);
  const img = slot.querySelector('img');
  if (!img) return;
  
  const photoId = slot.getAttribute('data-photo-id');
  
  showModal(`
    <div class="text-center">
      <h3 class="text-lg font-bold mb-4">사진 ${position}</h3>
      <img src="${img.src}" alt="Photo ${position}" class="w-full max-w-md mx-auto rounded-lg mb-4">
      
      <div class="flex gap-2 justify-center">
        <button onclick="closeModal()" class="btn btn-secondary">
          <i class="fas fa-arrow-left mr-2"></i>
          Go Back
        </button>
        <button onclick="deletePhoto('${photoId}', ${position})" class="btn btn-danger">
          <i class="fas fa-trash mr-2"></i>
          Delete
        </button>
      </div>
    </div>
  `);
}

// 카메라 열기
function openCamera() {
  // 빈 슬롯 찾기
  for (let i = 1; i <= 9; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (!slot.classList.contains('filled')) {
      openCameraForPosition(i);
      return;
    }
  }
}

// 특정 위치 카메라 열기
function openCameraForPosition(position) {
  showModal(`
    <div class="text-center">
      <h3 class="text-lg font-bold mb-4">사진 ${position} 촬영</h3>
      <p class="text-gray-600 mb-4">${COLORS[currentColor].korean} 색상을 찾아 촬영해주세요!</p>
      
      <video id="cameraPreview" class="camera-preview mb-4" autoplay playsinline></video>
      
      <div class="camera-controls">
        <button onclick="closeModal(); stopCamera();" class="btn btn-secondary">
          취소
        </button>
        <button onclick="capturePhoto(${position})" class="capture-btn">
          <i class="fas fa-camera"></i>
        </button>
      </div>
      
      <canvas id="captureCanvas" style="display: none;"></canvas>
    </div>
  `);
  
  startCamera();
}

// 카메라 시작
async function startCamera() {
  try {
    const video = document.getElementById('cameraPreview');
    if (!video) return;
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment', // 후면 카메라 우선
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    video.srcObject = stream;
    mediaStream = stream;
    
  } catch (error) {
    console.error('카메라 접근 오류:', error);
    showError('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
  }
}

// 카메라 정지
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

// 사진 촬영
function capturePhoto(position) {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('captureCanvas');
  
  if (!video || !canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  ctx.drawImage(video, 0, 0);
  
  // 원본 이미지
  const imageData = canvas.toDataURL('image/jpeg', 0.8);
  
  // 썸네일 생성
  const thumbnailSize = 200;
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = thumbnailSize;
  thumbnailCanvas.height = thumbnailSize;
  const thumbCtx = thumbnailCanvas.getContext('2d');
  
  // 정사각형으로 크롭
  const size = Math.min(canvas.width, canvas.height);
  const x = (canvas.width - size) / 2;
  const y = (canvas.height - size) / 2;
  
  thumbCtx.drawImage(canvas, x, y, size, size, 0, 0, thumbnailSize, thumbnailSize);
  const thumbnailData = thumbnailCanvas.toDataURL('image/jpeg', 0.7);
  
  // 서버에 저장
  savePhoto(position, imageData, thumbnailData);
  
  // 카메라 정지 및 모달 닫기
  stopCamera();
  closeModal();
}

// 사진 저장
async function savePhoto(position, imageData, thumbnailData) {
  try {
    showLoading('Saving photo...');
    
    // 세션 ID 확인 및 디버깅
    console.log('Current session:', currentSession);
    const sessionId = currentSession.sessionId || currentSession.id;
    console.log('Using session ID:', sessionId);
    
    if (!sessionId) {
      throw new Error('Session ID not found.');
    }
    
    const response = await axios.post('/api/photo/add', {
      sessionId: sessionId,
      position: position,
      imageData: imageData,
      thumbnailData: thumbnailData
    });
    
    // 슬롯이 이미 채워져 있는지 확인 (재촬영 케이스)
    const slot = document.getElementById(`slot-${position}`);
    const wasAlreadyFilled = slot.classList.contains('filled');
    
    // UI 업데이트
    slot.innerHTML = `<img src="${thumbnailData}" alt="Photo ${position}">`;
    slot.classList.add('filled');
    slot.setAttribute('data-photo-id', response.data.photoId);
    
    // 사진 개수 업데이트 (새로운 사진인 경우만)
    if (!wasAlreadyFilled) {
      photoCount++;
    }
    
    hideLoading();
    
    // 진행률 업데이트
    updateProgress();
    
    // GA 이벤트 추적
    trackEvent('photo_captured', {
      position: position,
      total_photos: photoCount,
      session_id: sessionId,
      color_name: currentColor,
      is_retake: wasAlreadyFilled
    });
    
    // 완성 체크
    if (photoCount === 9) {
      showCompletionMessage();
      trackEvent('collage_ready', {
        color_name: currentColor,
        session_id: sessionId
      });
    }
    
    showToast('📸 사진이 저장되었습니다!', 'success');
    
  } catch (error) {
    console.error('사진 저장 오류:', error);
    hideLoading();
    showError('사진 저장에 실패했습니다: ' + error.message);
  }
}

// 사진 삭제 (순차적 재정렬)
async function deletePhoto(photoId, position) {
  try {
    showLoading('Deleting...');
    
    await axios.delete(`/api/photo/${photoId}`);
    
    // 모든 사진 데이터를 배열로 수집
    const photos = [];
    for (let i = 1; i <= 9; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (slot && slot.classList.contains('filled') && i !== position) {
        const img = slot.querySelector('img');
        const photoId = slot.getAttribute('data-photo-id');
        if (img && photoId) {
          photos.push({
            id: photoId,
            src: img.src,
            originalPosition: i
          });
        }
      }
    }
    
    // 모든 슬롯 초기화
    for (let i = 1; i <= 9; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (slot) {
        slot.innerHTML = '';
        slot.classList.remove('filled');
        slot.removeAttribute('data-photo-id');
      }
    }
    
    // 삭제된 위치를 제외하고 앞으로 당겨서 재배치
    photos.forEach((photo, index) => {
      const newPosition = index + 1;
      const slot = document.getElementById(`slot-${newPosition}`);
      if (slot) {
        slot.innerHTML = `<img src="${photo.src}" alt="Photo ${newPosition}">`;
        slot.classList.add('filled');
        slot.setAttribute('data-photo-id', photo.id);
      }
    });
    
    photoCount = photos.length;
    
    closeModal();
    hideLoading();
    updateProgress();
    
    // 그리드 다시 그리기 (카메라 아이콘 위치 업데이트)
    showCollageScreen();
    
    // 기존 사진들을 다시 로드
    if (currentSession && currentSession.photos) {
      loadExistingPhotos();
    }
    
  } catch (error) {
    console.error('Photo delete error:', error);
    hideLoading();
    showError('Failed to delete photo.');
  }
}

// 진행률 업데이트
function updateProgress() {
  // 실제 사진 개수 재계산
  const actualCount = recalculatePhotoCount();
  const progress = Math.round((actualCount / 9) * 100);
  
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  
  // 진행률 텍스트 업데이트
  const progressText = document.querySelector('.text-sm.text-gray-600');
  if (progressText) {
    progressText.textContent = `${actualCount}/9 completed`;
  }
  
  // 완성 버튼 업데이트
  updateCompleteButton(actualCount);
}

// 완성 버튼 상태 업데이트
function updateCompleteButton(photoCount) {
  // 콜라주 화면에서만 버튼 업데이트
  const completeButton = document.querySelector('button[onclick="completeCollage()"]');
  const cameraButton = document.querySelector('button[onclick="openCamera()"]');
  
  if (photoCount === 9) {
    if (cameraButton && cameraButton.parentNode) {
      cameraButton.parentNode.innerHTML = `
        <button onclick="completeCollage()" class="btn btn-success w-full">
          <i class="fas fa-save mr-2"></i>
          콜라주 완성하기
        </button>
      `;
    }
  } else {
    if (completeButton && completeButton.parentNode) {
      completeButton.parentNode.innerHTML = `
        <button onclick="openCamera()" class="btn btn-primary w-full">
          <i class="fas fa-camera mr-2"></i>
          사진 찍기
        </button>
      `;
    }
  }
}

// 완성 메시지
function showCompletionMessage() {
  setTimeout(() => {
    showToast('🎉 9장 모두 완료! 콜라주를 완성해보세요!', 'success');
  }, 500);
}

// 미리보기 표시
function showPreview() {
  const slots = [];
  for (let i = 1; i <= 9; i++) {
    const slot = document.getElementById(`slot-${i}`);
    const img = slot.querySelector('img');
    slots.push(img ? img.src : null);
  }
  
  let previewHTML = '<div class="color-grid mx-auto mb-4">';
  for (let i = 0; i < 9; i++) {
    const src = slots[i];
    previewHTML += `
      <div class="photo-slot ${src ? 'filled' : ''}">
        ${src ? `<img src="${src}" alt="Photo ${i+1}">` : '<i class="fas fa-camera camera-icon"></i>'}
      </div>
    `;
  }
  previewHTML += '</div>';
  
  showModal(`
    <div class="text-center">
      <h3 class="text-lg font-bold mb-4">콜라주 미리보기</h3>
      ${previewHTML}
      <p class="text-gray-600 mb-4">${photoCount}/9 완료</p>
      <button onclick="closeModal()" class="btn btn-primary">
        OK
      </button>
    </div>
  `);
}

// 현재 채워진 사진 개수 정확히 계산
function recalculatePhotoCount() {
  let count = 0;
  for (let i = 1; i <= 9; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot && slot.classList.contains('filled')) {
      count++;
    }
  }
  photoCount = count;
  return count;
}

// 콜라주 완성
async function completeCollage() {
  // 실제 사진 개수 재계산
  const actualPhotoCount = recalculatePhotoCount();
  
  if (actualPhotoCount < 9) {
    showError(`9장의 사진을 모두 촬영해주세요. (현재 ${actualPhotoCount}/9)`);
    return;
  }
  
  try {
    showLoading('콜라주 생성 중...');
    
    // 콜라주 이미지 생성
    const collageData = await generateCollageImage();
    
    // 세션 ID 확인
    const sessionId = currentSession.sessionId || currentSession.id;
    if (!sessionId) {
      throw new Error('Session ID not found.');
    }
    
    // 서버에 저장
    const response = await axios.post('/api/collage/complete', {
      sessionId: sessionId,
      collageData: collageData
    });
    
    hideLoading();
    
    // GA 이벤트 추적
    trackEvent('collage_completed', {
      color_name: currentColor,
      session_id: sessionId,
      photo_count: actualPhotoCount
    });
    
    // 완성 화면 표시
    showCompletedScreen(collageData);
    
  } catch (error) {
    console.error('콜라주 완성 오류:', error);
    hideLoading();
    showError('콜라주 생성에 실패했습니다: ' + error.message);
  }
}

// 콜라주 이미지 생성
async function generateCollageImage() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const size = 900; // 3x3 = 300px per cell
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    const cellSize = size / 3;
    let loadedImages = 0;
    
    for (let i = 1; i <= 9; i++) {
      const slot = document.getElementById(`slot-${i}`);
      const img = slot.querySelector('img');
      
      if (img) {
        const newImg = new Image();
        newImg.onload = () => {
          const row = Math.floor((i-1) / 3);
          const col = (i-1) % 3;
          const x = col * cellSize;
          const y = row * cellSize;
          
          ctx.drawImage(newImg, x, y, cellSize, cellSize);
          
          loadedImages++;
          if (loadedImages === photoCount) {
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          }
        };
        newImg.src = img.src;
      }
    }
  });
}

// 완성 화면
function showCompletedScreen(collageData) {
  // 배경색 유지 (현재 색상)
  const colorInfo = COLORS[currentColor];
  const isLightColor = ['yellow', 'white'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  const buttonStyle = isLightColor ? 'dark' : 'light';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in p-4" style="color: ${textColor}">
      <h2 class="text-2xl font-bold mb-6">🎉 Collage Complete!</h2>
      
      <div class="mb-6">
        <img src="${collageData}" alt="Completed collage" class="w-full max-w-md mx-auto rounded-lg shadow-lg">
      </div>
      
      <div class="space-y-4">
        <button onclick="downloadCollage('${collageData}')" class="btn btn-${buttonStyle} w-full">
          <i class="fas fa-download mr-2"></i>
          Save Collage
        </button>
        
        <button onclick="showHistoryScreen()" class="btn btn-outline-${buttonStyle} w-full">
          <i class="fas fa-history mr-2"></i>
          My Collages
        </button>
        
        <button onclick="startNewCollage()" class="btn btn-outline-${buttonStyle} w-full">
          <i class="fas fa-plus mr-2"></i>
          Create New Collage
        </button>
      </div>
    </div>
  `;
}

// 콜라주 다운로드
function downloadCollage(dataUrl) {
  const link = document.createElement('a');
  link.download = `color-hunt-${currentColor}-${new Date().toISOString().split('T')[0]}.jpg`;
  link.href = dataUrl;
  link.click();
  
  // GA 이벤트 추적
  trackEvent('collage_downloaded', {
    color_name: currentColor || 'unknown',
    file_name: link.download
  });
  
  showToast('콜라주가 저장되었습니다! 📸', 'success');
}

// 새 콜라주 시작
function startNewCollage() {
  currentSession = null;
  currentColor = null;
  photoCount = 0;
  showColorSelectionScreen();
}

// 세션 리셋
async function resetSession() {
  if (!confirm('정말로 처음부터 다시 시작하시겠습니까? 현재 진행사항이 모두 삭제됩니다.')) {
    return;
  }
  
  currentSession = null;
  currentColor = null;
  photoCount = 0;
  showColorSelectionScreen();
}

// 이력 화면
async function showHistoryScreen() {
  try {
    showLoading('이력 불러오는 중...');
    
    const response = await axios.get(`/api/history/${currentUser}?limit=20`);
    const { collages } = response.data;
    
    hideLoading();
    
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="animate-fade-in">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">내 콜라주 이력</h2>
          <button onclick="checkCurrentSession()" class="btn btn-secondary">
            <i class="fas fa-arrow-left mr-2"></i>
            Go Back
          </button>
        </div>
        
        ${collages.length === 0 ? `
          <div class="text-center py-12">
            <i class="fas fa-images text-4xl text-gray-400 mb-4"></i>
            <p class="text-gray-600 mb-4">아직 완성한 콜라주가 없습니다.</p>
            <button onclick="showColorSelectionScreen()" class="btn btn-primary">
              첫 번째 콜라주 만들기
            </button>
          </div>
        ` : `
          <div class="history-grid">
            ${collages.map(collage => `
              <div class="history-card">
                <img src="${collage.collage_data}" alt="${collage.color} 콜라주">
                <div class="history-card-content">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-semibold" style="color: ${COLORS[collage.color]?.hex || '#666'}">
                      ${COLORS[collage.color]?.korean || collage.color}
                    </span>
                    <span class="text-sm text-gray-500">${collage.date}</span>
                  </div>
                  <button onclick="downloadCollage('${collage.collage_data}')" class="btn btn-secondary w-full text-sm">
                    <i class="fas fa-download mr-1"></i>
                    Download
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
  } catch (error) {
    console.error('이력 조회 오류:', error);
    hideLoading();
    showError('이력을 불러오는데 실패했습니다.');
  }
}

// 유틸리티 함수들

function showModal(content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content animate-fade-in">
      <button onclick="closeModal()" class="modal-close">
        <i class="fas fa-times"></i>
      </button>
      ${content}
    </div>
  `;
  modal.id = 'currentModal';
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('currentModal');
  if (modal) {
    modal.remove();
  }
  stopCamera();
}

function showLoading(message = 'Processing...') {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingOverlay';
  loadingDiv.className = 'modal';
  loadingDiv.innerHTML = `
    <div class="modal-content text-center">
      <div class="loading mx-auto mb-4"></div>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(loadingDiv);
}

function hideLoading() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) {
    loading.remove();
  }
}

function showError(message) {
  showToast(`❌ ${message}`, 'error');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg text-white z-50 animate-fade-in ${
    type === 'error' ? 'bg-red-500' : 
    type === 'success' ? 'bg-green-500' : 
    'bg-blue-500'
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Google Analytics 이벤트 추적 함수
function trackEvent(eventName, parameters = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, {
      event_category: 'Color Hunt',
      event_label: parameters.label || '',
      value: parameters.value || 0,
      ...parameters
    });
  }
  console.log('GA Event:', eventName, parameters);
}

// 전역 이벤트 리스너
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// 뒤로가기 방지 (선택사항)
// window.addEventListener('beforeunload', (e) => {
//   if (currentSession && photoCount > 0) {
//     e.preventDefault();
//     e.returnValue = '';
//   }
// });