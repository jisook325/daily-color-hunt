// Color Hunt - 메인 애플리케이션

// 전역 상태
let currentUser = null;
let currentSession = null;
let currentColor = null;
let photoCount = 0;
let mediaStream = null;

// 컬러 정보
const COLORS = {
  red: { hex: '#FF0000', korean: '빨강' },
  orange: { hex: '#FF8C00', korean: '주황' },
  yellow: { hex: '#FFD700', korean: '노랑' },
  green: { hex: '#00FF00', korean: '초록' },
  blue: { hex: '#0066FF', korean: '파랑' },
  indigo: { hex: '#4B0082', korean: '남색' },
  purple: { hex: '#8A2BE2', korean: '보라' },
  white: { hex: '#FFFFFF', korean: '흰색' },
  black: { hex: '#000000', korean: '검정' }
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
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in">
      <h2 class="text-2xl font-bold mb-6">오늘의 컬러는?</h2>
      <p class="text-gray-600 mb-8">새로운 컬러를 찾아 사진을 찍어보세요!</p>
      
      <button onclick="getNewColor()" class="btn btn-primary mb-4">
        <i class="fas fa-palette mr-2"></i>
        새로운 컬러 받기
      </button>
      
      <div class="mt-8">
        <button onclick="showHistoryScreen()" class="btn btn-secondary">
          <i class="fas fa-history mr-2"></i>
          내 콜라주 보기
        </button>
      </div>
    </div>
  `;
}

// 새로운 컬러 받기
async function getNewColor(excludeColor = null) {
  try {
    showLoading('새로운 컬러 찾는 중...');
    
    const response = await axios.post('/api/color/new', {
      userId: currentUser,
      excludeColor: excludeColor
    });
    
    const { color, date } = response.data;
    currentColor = color.name;
    
    hideLoading();
    showColorConfirmationScreen(color, date);
    
  } catch (error) {
    console.error('컬러 받기 오류:', error);
    hideLoading();
    showError('컬러를 받아오는데 실패했습니다.');
  }
}

// 컬러 확인 화면
function showColorConfirmationScreen(color, date) {
  const colorInfo = COLORS[color.name];
  const isLightColor = ['yellow', 'white'].includes(color.name);
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in">
      <p class="text-sm text-gray-500 mb-4">${date}</p>
      <p class="text-lg mb-4">오늘의 컬러는</p>
      
      <div class="color-card ${isLightColor ? 'light-color' : ''}" style="--color-hex: ${colorInfo.hex}">
        <h2>${colorInfo.korean}</h2>
        <p class="text-lg opacity-80">${color.name.toUpperCase()}</p>
      </div>
      
      <div class="mt-8 space-y-4">
        <button onclick="confirmColor()" class="btn btn-primary w-full">
          <i class="fas fa-check mr-2"></i>
          확인
        </button>
        <button onclick="getNewColor('${color.name}')" class="btn btn-secondary w-full">
          <i class="fas fa-refresh mr-2"></i>
          다른 컬러 받기
        </button>
      </div>
    </div>
  `;
}

// 컬러 확인 후 세션 시작
async function confirmColor() {
  try {
    showLoading('세션 시작 중...');
    
    const response = await axios.post('/api/session/start', {
      userId: currentUser,
      color: currentColor
    });
    
    currentSession = response.data;
    photoCount = 0;
    
    hideLoading();
    showCollageScreen();
    
  } catch (error) {
    console.error('세션 시작 오류:', error);
    hideLoading();
    showError('세션을 시작하는데 실패했습니다.');
  }
}

// 콜라주 촬영 화면
function showCollageScreen() {
  const colorInfo = COLORS[currentColor];
  const progress = Math.round((photoCount / 9) * 100);
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="animate-fade-in">
      <!-- 헤더 -->
      <div class="text-center mb-6">
        <h2 class="text-xl font-bold mb-2" style="color: ${colorInfo.hex}">
          ${colorInfo.korean} 찾기
        </h2>
        <p class="text-sm text-gray-600 mb-2">${photoCount}/9 완료</p>
        
        <!-- 프로그레스 바 -->
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <!-- 사진 그리드 -->
      <div class="color-grid mb-6" id="photoGrid">
        ${generatePhotoGrid()}
      </div>
      
      <!-- 하단 버튼들 -->
      <div class="text-center space-y-3">
        ${photoCount === 9 ? `
          <button onclick="completeCollage()" class="btn btn-success w-full">
            <i class="fas fa-save mr-2"></i>
            콜라주 완성하기
          </button>
        ` : `
          <button onclick="openCamera()" class="btn btn-primary w-full">
            <i class="fas fa-camera mr-2"></i>
            사진 찍기
          </button>
        `}
        
        <div class="flex gap-2">
          <button onclick="showPreview()" class="btn btn-secondary flex-1">
            <i class="fas fa-eye mr-2"></i>
            미리보기
          </button>
          <button onclick="showHistoryScreen()" class="btn btn-secondary flex-1">
            <i class="fas fa-history mr-2"></i>
            이력보기
          </button>
        </div>
        
        <button onclick="resetSession()" class="btn btn-danger w-full">
          <i class="fas fa-trash mr-2"></i>
          처음부터 다시
        </button>
      </div>
    </div>
  `;
  
  // 기존 사진 데이터 로드
  if (currentSession && currentSession.photos) {
    loadExistingPhotos();
  }
}

// 사진 그리드 생성
function generatePhotoGrid() {
  let gridHTML = '';
  for (let i = 1; i <= 9; i++) {
    gridHTML += `
      <div class="photo-slot" id="slot-${i}" onclick="handleSlotClick(${i})">
        <i class="fas fa-camera camera-icon"></i>
      </div>
    `;
  }
  return gridHTML;
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

// 슬롯 클릭 처리
function handleSlotClick(position) {
  const slot = document.getElementById(`slot-${position}`);
  if (slot.classList.contains('filled')) {
    // 이미 있는 사진 - 크게 보기
    showPhotoDetail(position);
  } else {
    // 빈 슬롯 - 카메라 열기
    openCameraForPosition(position);
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
          돌아가기
        </button>
        <button onclick="deletePhoto('${photoId}', ${position})" class="btn btn-danger">
          <i class="fas fa-trash mr-2"></i>
          삭제하기
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
    showLoading('사진 저장 중...');
    
    // 세션 ID 확인 및 디버깅
    console.log('Current session:', currentSession);
    const sessionId = currentSession.sessionId || currentSession.id;
    console.log('Using session ID:', sessionId);
    
    if (!sessionId) {
      throw new Error('세션 ID를 찾을 수 없습니다.');
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
    
    // 완성 체크
    if (photoCount === 9) {
      showCompletionMessage();
    }
    
    showToast('📸 사진이 저장되었습니다!', 'success');
    
  } catch (error) {
    console.error('사진 저장 오류:', error);
    hideLoading();
    showError('사진 저장에 실패했습니다: ' + error.message);
  }
}

// 사진 삭제
async function deletePhoto(photoId, position) {
  try {
    showLoading('삭제 중...');
    
    await axios.delete(`/api/photo/${photoId}`);
    
    // UI 업데이트
    const slot = document.getElementById(`slot-${position}`);
    slot.innerHTML = '<i class="fas fa-camera camera-icon"></i>';
    slot.classList.remove('filled');
    slot.removeAttribute('data-photo-id');
    
    photoCount--;
    
    closeModal();
    hideLoading();
    updateProgress();
    
  } catch (error) {
    console.error('사진 삭제 오류:', error);
    hideLoading();
    showError('사진 삭제에 실패했습니다.');
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
    progressText.textContent = `${actualCount}/9 완료`;
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
        확인
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
      throw new Error('세션 ID를 찾을 수 없습니다.');
    }
    
    // 서버에 저장
    const response = await axios.post('/api/collage/complete', {
      sessionId: sessionId,
      collageData: collageData
    });
    
    hideLoading();
    
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
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in">
      <h2 class="text-2xl font-bold mb-6">🎉 콜라주 완성!</h2>
      
      <div class="mb-6">
        <img src="${collageData}" alt="완성된 콜라주" class="w-full max-w-md mx-auto rounded-lg shadow-lg">
      </div>
      
      <div class="space-y-4">
        <button onclick="downloadCollage('${collageData}')" class="btn btn-success w-full">
          <i class="fas fa-download mr-2"></i>
          콜라주 저장하기
        </button>
        
        <button onclick="showHistoryScreen()" class="btn btn-secondary w-full">
          <i class="fas fa-history mr-2"></i>
          내 콜라주 보기
        </button>
        
        <button onclick="startNewCollage()" class="btn btn-primary w-full">
          <i class="fas fa-plus mr-2"></i>
          새로운 콜라주 만들기
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
            돌아가기
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
                    다운로드
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

function showLoading(message = '처리 중...') {
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