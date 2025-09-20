// Color Hunt - 메인 애플리케이션

// 전역 상태
let currentUser = null;
let currentSession = null;
let currentColor = null;
let photoCount = 0;
let mediaStream = null;
let gameMode = 'nine'; // 'nine' 또는 'unlimited'

// 상태바 색상 업데이트 함수 (강화된 버전)
function updateThemeColor(colorKey) {
  if (!colorKey || !COLORS[colorKey]) {
    console.log(`❌ 잘못된 색상 키: ${colorKey}`);
    return;
  }
  
  const colorHex = COLORS[colorKey].hex;
  console.log(`🎨 상태바 색상 업데이트 시도: ${colorKey} → ${colorHex}`);
  
  // 1. 기존 theme-color 메타 태그들을 모두 제거
  const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
  existingMetas.forEach(meta => meta.remove());
  
  // 2. 새로운 theme-color 메타 태그 생성 및 추가
  const themeColorMeta = document.createElement('meta');
  themeColorMeta.setAttribute('name', 'theme-color');
  themeColorMeta.setAttribute('content', colorHex);
  document.head.appendChild(themeColorMeta);
  
  // 3. iOS Safari용 추가 메타 태그들
  const appleStatusBarMeta = document.createElement('meta');
  appleStatusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
  appleStatusBarMeta.setAttribute('content', 'default');
  document.head.appendChild(appleStatusBarMeta);
  
  // 4. 브라우저 강제 새로고침을 위한 DOM 조작
  setTimeout(() => {
    const newMeta = document.createElement('meta');
    newMeta.setAttribute('name', 'theme-color');
    newMeta.setAttribute('content', colorHex);
    document.head.appendChild(newMeta);
    
    // 기존 메타 태그 제거
    const oldMetas = document.querySelectorAll('meta[name="theme-color"]:not(:last-child)');
    oldMetas.forEach(meta => meta.remove());
  }, 100);
  
  console.log(`✅ 상태바 색상 업데이트 완료: ${colorKey} → ${colorHex}`);
  console.log(`📱 현재 메타 태그:`, document.querySelector('meta[name="theme-color"]'));
}

// 다국어 시스템
let currentLanguage = 'en'; // 기본 언어
let i18nData = {}; // 다국어 데이터 저장소
let isI18nLoaded = false; // 로딩 상태

// 컬러 정보
const COLORS = {
  red: { hex: '#FF3333', english: 'Red', korean: '빨강' },
  orange: { hex: '#FFCC99', english: 'Warm Peach', korean: '주황' },
  yellow: { hex: '#FFF2CC', english: 'Cream Yellow', korean: '노랑' },
  green: { hex: '#C6E2C7', english: 'Sage Green', korean: '초록' },
  blue: { hex: '#B3D3FF', english: 'Sky Blue', korean: '파랑' },
  indigo: { hex: '#C7B3EB', english: 'Purple', korean: '보라' },
  purple: { hex: '#E0B3FF', english: 'Violet', korean: '자주' },
  black: { hex: '#2D2D2D', english: 'Charcoal', korean: '검정' }
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎨 Color Hunt 앱 시작!');
  
  // 사용자 ID 생성 또는 로드
  currentUser = getUserId();
  
  // 저장된 언어 설정 로드
  const savedLanguage = localStorage.getItem('colorhunt_language');
  if (savedLanguage && ['en', 'ko'].includes(savedLanguage)) {
    currentLanguage = savedLanguage;
  }
  
  // 메인 컨테이너 설정
  const app = document.getElementById('app');
  if (!app) {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center p-8">
          <div id="app"></div>
        </div>
      </div>
    `;
  }
  
  // 다국어 데이터 로드
  showLoading('Loading...');
  await loadI18nData();
  hideLoading();
  
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

// 현재 세션 확인 (캐싱 최적화)
async function checkCurrentSession() {
  try {
    // 로컬 캐시 먼저 확인 (성능 최적화)
    const cachedSession = localStorage.getItem('colorhunt_current_session');
    if (cachedSession) {
      try {
        const session = JSON.parse(cachedSession);
        // 24시간 이내 세션은 캐시 사용
        const sessionAge = Date.now() - new Date(session.created_at).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000 && session.status === 'in_progress') {
          currentSession = session;
          currentColor = session.color;
          updateThemeColor(currentColor);
          photoCount = session.photos?.length || 0;
          gameMode = session.mode || 'nine';
          showCollageScreen();
          return; // 캐시된 데이터 사용, 서버 호출 생략
        }
      } catch (e) {
        // 캐시 파싱 실패시 계속 진행
        localStorage.removeItem('colorhunt_current_session');
      }
    }
    
    showLoading(t('alert.loading_session'));
    
    const response = await axios.get(`/api/session/current/${currentUser}`);
    const { session } = response.data;
    
    // 세션을 로컬 캐시에 저장 (성능 최적화)
    if (session && session.status === 'in_progress') {
      localStorage.setItem('colorhunt_current_session', JSON.stringify(session));
    }
    
    hideLoading();
    
    if (session && session.status === 'in_progress') {
      // 진행 중인 세션이 있으면 콜라주 화면으로
      currentSession = session;
      currentColor = session.color;
      updateThemeColor(currentColor); // 상태바 색상 업데이트
      photoCount = session.photos?.length || 0;
      gameMode = session.mode || 'nine'; // 모드 정보 복원
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
      <h1 class="text-3xl font-bold mb-8 text-gray-800">${t('main.whats_today_color')}</h1>
      
      <div class="text-gray-600 leading-relaxed whitespace-pre-line mb-8">
        ${t('main.discover_color')}
      </div>
      
      <button onclick="getNewColor()" class="btn btn-primary mb-4 w-full py-4 text-lg">
        ${t('main.start')}
      </button>
      
      <!-- 언어 토글 버튼 -->
      <div class="mt-6">
        <button onclick="toggleLanguage()" class="text-action-btn">
          <i class="fas fa-globe mr-1"></i>
          ${currentLanguage === 'en' ? '한국어' : 'English'}
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
    updateThemeColor(currentColor); // 상태바 색상 업데이트
    
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

// 컬러 확인 화면 (바로 15장 모드로 진입)
function showColorConfirmationScreen(color, date) {
  const colorInfo = COLORS[color.name];
  const isLightColor = ['yellow'].includes(color.name);
  
  // 상태바 색상 즉시 업데이트 (배경색 변경과 함께)
  updateThemeColor(color.name);
  
  // 전체 배경색 변경
  document.body.style.backgroundColor = colorInfo.hex;
  document.body.style.transition = 'background-color 0.5s ease';
  
  // 텍스트 색상 결정
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  const buttonStyle = isLightColor ? 'dark' : 'light';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in p-4" style="color: ${textColor}">
      <p class="text-sm mb-4 opacity-70">${date}</p>
      <p class="text-lg mb-4">${t('color.today_color_is')}</p>
      
      <div class="mb-8">
        <h2 class="text-4xl font-bold mb-2">${t('color.' + color.name)}</h2>
        <p class="text-lg opacity-80">${color.name.toUpperCase()}</p>
      </div>
      
      <div class="mt-8 space-y-4">
        <button onclick="startNineMode()" class="btn btn-${buttonStyle} w-full py-4 text-lg">
          <i class="fas fa-camera mr-2"></i>
          ${t('main.nine_mode')}
        </button>
        
        <button onclick="getNewColor('${color.name}')" class="btn btn-outline-${buttonStyle} w-full mt-6">
          <i class="fas fa-refresh mr-2"></i>
          ${t('color.get_another_color')}
        </button>
      </div>
    </div>
  `;
}

// 9개 모드 시작
async function startNineMode() {
  gameMode = 'nine';
  await confirmColor();
}

// 무제한 모드 시작  
async function startUnlimitedMode() {
  gameMode = 'unlimited';
  await confirmColor();
}

// 9개 모드 시작
async function startNineMode() {
  gameMode = 'nine';
  await confirmColor();
}

// 무제한 모드 시작  
async function startUnlimitedMode() {
  gameMode = 'unlimited';
  await confirmColor();
}

// 컬러 확인 후 세션 시작
async function confirmColor() {
  try {
    showLoading(t('alert.loading_session'));
    
    const response = await axios.post('/api/session/start', {
      userId: currentUser,
      color: currentColor,
      mode: gameMode
    });
    
    currentSession = response.data;
    photoCount = 0;
    updateThemeColor(currentColor); // 상태바 색상 업데이트
    
    // 새 세션을 로컬 캐시에 저장 (성능 최적화)
    localStorage.setItem('colorhunt_current_session', JSON.stringify(currentSession));
    
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
    showError(t('alert.failed_start_session'));
  }
}

// 콜라주 촬영 화면
function showCollageScreen() {
  // 콜라주 화면 진입 시 상태바 색상 확실히 업데이트
  if (currentColor) {
    updateThemeColor(currentColor);
  }
  
  if (gameMode === 'unlimited') {
    showUnlimitedCollageScreen();
  } else {
    showNineCollageScreen();
  }
}

// 15개 모드 콜라주 화면 (3x5 레이아웃)
function showNineCollageScreen() {
  const colorInfo = COLORS[currentColor];
  const progress = Math.round((photoCount / 15) * 100);
  
  // 배경색 유지
  if (document.body.style.backgroundColor !== colorInfo.hex) {
    document.body.style.backgroundColor = colorInfo.hex;
    document.body.style.transition = 'background-color 0.5s ease';
  }
  
  // 텍스트 색상 결정
  const isLightColor = ['yellow'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  
  const app = document.getElementById('app');
  
  // 현재 날짜 생성
  const currentDate = new Date().toISOString().split('T')[0];
  
  app.innerHTML = `
    <div class="modern-collage-screen animate-fade-in" style="color: ${textColor}">
      <!-- 상단 정보 -->
      <div class="collage-header">
        <div class="date-display">${currentDate}</div>
        <h1 class="color-question">${t('color.what_is_your_color', { color: t('color.' + currentColor) })}</h1>
        
        <!-- 프로그레스 바 -->
        <div class="progress-container">
          <div class="progress-track">
            <div class="progress-fill-modern" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${photoCount} / 15</div>
        </div>
      </div>
      
      <!-- 사진 그리드 -->
      <div class="photo-grid-modern" id="photoGrid">
        ${generateNinePhotoGrid()}
      </div>
      
      <!-- 하단 액션 -->
      <div class="collage-actions">
        ${photoCount === 15 ? `
          <button onclick="completeCollage()" class="main-action-btn complete-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);">
            ${t('collage.complete_collage')}
          </button>
        ` : `
          <button onclick="openCamera()" class="main-action-btn photo-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);">
            ${t('picture.take_photo')}
          </button>
        `}
        
        <div class="secondary-actions">
          <button onclick="resetSession()" class="text-action-btn">
            ${t('management.reset')}
          </button>
          <button onclick="showHistoryScreen()" class="text-action-btn">
            ${t('management.history')}
          </button>
          <button onclick="toggleLanguage()" class="text-action-btn">
            ${currentLanguage === 'en' ? '한국어' : 'English'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 기존 사진 데이터 로드
  if (currentSession && currentSession.photos) {
    loadExistingPhotos();
  }
}

// 무제한 모드 콜라주 화면 (15개 슬롯, 3x5 그리드)
function showUnlimitedCollageScreen() {
  const colorInfo = COLORS[currentColor];
  
  // 상태바 색상 업데이트 (무제한 모드 진입 시)
  updateThemeColor(currentColor);
  
  // 배경색 유지
  if (document.body.style.backgroundColor !== colorInfo.hex) {
    document.body.style.backgroundColor = colorInfo.hex;
    document.body.style.transition = 'background-color 0.5s ease';
  }
  
  // 텍스트 색상 결정
  const isLightColor = ['yellow'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  
  const app = document.getElementById('app');
  
  // 현재 날짜 생성
  const currentDate = new Date().toISOString().split('T')[0];
  
  app.innerHTML = `
    <div class="unlimited-collage-screen animate-fade-in" style="color: ${textColor}">
      <!-- 상단: 날짜, 질문, 촬영 버튼 -->
      <div class="unlimited-header">
        <div class="date-display">${currentDate}</div>
        <h1 class="color-question">${t('color.what_is_your_color', { color: t('color.' + currentColor) })}</h1>
        
        <button onclick="openCamera()" class="main-action-btn photo-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8); margin: 16px 0;">
          ${t('picture.take_photo', { number: '' })} (${photoCount}/15)
        </button>
      </div>
      
      <!-- 15개 사진 그리드 (3x5) -->
      <div class="unlimited-photo-grid" id="photoGrid">
        ${generateUnlimitedPhotoGrid()}
      </div>
      
      <!-- 하단 액션 -->
      <div class="unlimited-actions">
        ${photoCount >= 9 ? `
          <button onclick="completeCollage()" class="complete-action-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);">
            ${t('collage.complete_collage')}
          </button>
        ` : `
          <div class="complete-requirement" style="opacity: 0.7; font-size: 14px;">
            ${t('alert.take_all_photos', { count: photoCount })}
          </div>
        `}
        
        <div class="secondary-actions">
          <button onclick="resetSession()" class="text-action-btn">
            ${t('management.reset')}
          </button>
          <button onclick="showHistoryScreen()" class="text-action-btn">
            ${t('management.history')}
          </button>
          <button onclick="toggleLanguage()" class="text-action-btn">
            ${currentLanguage === 'en' ? '한국어' : 'English'}
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 기존 사진 데이터 로드
  if (currentSession && currentSession.photos) {
    loadExistingPhotos();
  }
}

// 15개 모드 그리드 생성 (3x5 레이아웃)
function generateNinePhotoGrid() {
  let gridHTML = '';
  let nextEmptySlot = photoCount + 1;
  
  for (let i = 1; i <= 15; i++) {
    const showCamera = (i === nextEmptySlot && i <= 15);
    gridHTML += `
      <div class="photo-slot" id="slot-${i}" onclick="handleSlotClick(${i})">
        ${showCamera ? '<i class="fas fa-camera camera-icon"></i>' : ''}
      </div>
    `;
  }
  return gridHTML;
}

// 무제한 모드 그리드 생성 (15개, 3x5)
function generateUnlimitedPhotoGrid() {
  let gridHTML = '';
  
  for (let i = 1; i <= 15; i++) {
    gridHTML += `
      <div class="unlimited-photo-slot" id="slot-${i}" onclick="handleUnlimitedSlotClick(${i})">
        <!-- 빈 슬롯 -->
      </div>
    `;
  }
  return gridHTML;
}

// 기존 함수들 (호환성)
function generateSequentialPhotoGrid() {
  return generateNinePhotoGrid();
}

function generatePhotoGrid() {
  return generateNinePhotoGrid();
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

// 15개 모드 슬롯 클릭 처리
function handleSlotClick(position) {
  const slot = document.getElementById(`slot-${position}`);
  
  if (slot.classList.contains('filled')) {
    // 이미 있는 사진 - 크게 보기
    showPhotoDetail(position);
  } else {
    // 빈 슬롯 - 항상 다음 빈 슬롯에 촬영 (어떤 슬롯을 눌러도)
    const nextSlot = photoCount + 1;
    if (nextSlot <= 9) {
      openCameraForPosition(nextSlot);
    }
  }
}

// 무제한 모드 슬롯 클릭 처리
function handleUnlimitedSlotClick(position) {
  const slot = document.getElementById(`slot-${position}`);
  
  if (slot.classList.contains('filled')) {
    // 이미 있는 사진 - 크게 보기
    showPhotoDetail(position);
  } else {
    // 빈 슬롯 - 해당 위치에 바로 촬영
    if (photoCount < 15) {
      openCameraForPosition(position);
    }
  }
}

// 사진 상세 보기 (새로운 전체 화면 디자인)
function showPhotoDetail(position) {
  const slot = document.getElementById(`slot-${position}`);
  const img = slot.querySelector('img');
  if (!img) return;
  
  const photoId = slot.getAttribute('data-photo-id');
  
  // 현재 배경색 유지
  const colorInfo = COLORS[currentColor];
  const isLightColor = ['yellow'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="photo-detail-screen animate-fade-in" style="background: ${colorInfo.hex}; color: ${textColor};">
      <!-- 상단 제목 -->
      <div class="photo-detail-header">
        <h2 class="photo-title">Photo ${position}</h2>
      </div>
      
      <!-- 중앙 사진 -->
      <div class="photo-display-container">
        <div class="photo-display-frame">
          <img src="${img.src}" alt="Picture ${position}" class="photo-display-image">
        </div>
      </div>
      
      <!-- 하단 액션 버튼 -->
      <div class="photo-detail-actions">
        <button onclick="closePhotoDetail()" class="detail-action-btn back-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.6);">
          <i class="fas fa-arrow-left mr-2"></i>
          ${t('picture.back')}
        </button>
        
        <button onclick="deletePhoto('${photoId}', ${position})" class="detail-action-btn delete-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.6);">
          ${t('picture.delete')}
        </button>
      </div>
    </div>
  `;
}

// 사진 상세보기 닫기
function closePhotoDetail() {
  showCollageScreen();
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

// 특정 위치 카메라 열기 (전체 화면)
function openCameraForPosition(position) {
  // 현재 배경색 유지
  const colorInfo = COLORS[currentColor];
  const isLightColor = ['yellow'].includes(currentColor);
  
  // 전체 화면 카메라 인터페이스로 변경
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="fullscreen-camera animate-fade-in">
      <!-- 카메라 뷰 -->
      <video id="cameraPreview" class="fullscreen-video" autoplay playsinline></video>
      
      <!-- 상단 컨트롤 -->
      <div class="camera-header">
        <button onclick="closeCameraView()" class="camera-back-btn">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="camera-info">
          <span class="photo-number">Photo ${position}</span>
          <span class="color-name">Find ${t('color.' + currentColor)}</span>
        </div>
      </div>
      
      <!-- 하단 컨트롤 -->
      <div class="camera-footer">
        <div class="camera-controls-fullscreen">
          <button onclick="closeCameraView()" class="cancel-btn-fullscreen">
            <i class="fas fa-times"></i>
          </button>
          
          <button onclick="capturePhoto(${position})" class="capture-btn-fullscreen">
            <div class="capture-circle">
              <div class="capture-inner"></div>
            </div>
          </button>
          
          <div class="camera-spacer"></div>
        </div>
      </div>
      
      <canvas id="captureCanvas" style="display: none;"></canvas>
    </div>
  `;
  
  startCamera();
}

// 카메라 뷰 닫기
function closeCameraView() {
  stopCamera();
  showCollageScreen();
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
    
    // 터치 이벤트 기본 동작 방지 (페이지 확대/줌 방지)
    video.addEventListener('touchstart', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    video.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    video.addEventListener('touchend', (e) => {
      e.preventDefault();
    }, { passive: false });
    
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
  
  // 카메라 정지 및 화면 닫기
  stopCamera();
  closeCameraView();
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
    
    // currentSession.photos에 새 사진 데이터 즉시 추가/업데이트
    if (!currentSession.photos) {
      currentSession.photos = [];
    }
    
    // 기존 동일 포지션 사진 제거 (재촬영 케이스)
    currentSession.photos = currentSession.photos.filter(p => p.position !== position);
    
    // 새 사진 데이터 추가
    currentSession.photos.push({
      id: response.data.photoId,
      position: position,
      thumbnail_data: thumbnailData,
      image_data: imageData,
      created_at: new Date().toISOString()
    });
    
    // 사진 개수 업데이트 (새로운 사진인 경우만)
    if (!wasAlreadyFilled) {
      photoCount++;
    }
    
    // 업데이트된 세션을 캐시에 저장 (성능 최적화)
    localStorage.setItem('colorhunt_current_session', JSON.stringify(currentSession));
    
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
    if (photoCount === 15) {
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
    for (let i = 1; i <= 15; i++) {
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
    for (let i = 1; i <= 15; i++) {
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
    
    // 브라우저 캐시에서 삭제된 이미지 강제 제거
    const deletedPhotoSlot = document.getElementById(`slot-${position}`);
    if (deletedPhotoSlot) {
      const img = deletedPhotoSlot.querySelector('img');
      if (img && img.src) {
        // 이미지 캐시 무효화
        img.src = '';
        img.removeAttribute('src');
      }
    }
    
    closeModal();
    hideLoading();
    
    // 콜라주 화면을 완전히 새로고침하여 캐시 문제 해결
    showCollageScreen();
    
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
  const progress = Math.round((actualCount / 15) * 100);
  
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
  
  if (photoCount === 15) {
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
    showToast('🎉 15장 모두 완료! 콜라주를 완성해보세요!', 'success');
  }, 500);
}

// 미리보기 기능 제거됨 (디자인 간소화)

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
    showError(`15장의 사진을 모두 촬영해주세요. (현재 ${actualPhotoCount}/15)`);
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

// 둥근 사각형 그리기 헬퍼 함수
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 콜라주 이미지 생성 (3x5 = 15장)
async function generateCollageImage() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 3x5 레이아웃: 900x1500 (각 셀 300x300)
    const cellSize = 300;
    const gap = 8; // 슬롯 간격
    const radius = 8; // border-radius
    
    canvas.width = 3 * cellSize + 2 * gap;  // 924px
    canvas.height = 5 * cellSize + 4 * gap; // 1532px
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let loadedImages = 0;
    
    for (let i = 1; i <= 15; i++) {
      const slot = document.getElementById(`slot-${i}`);
      const img = slot.querySelector('img');
      
      if (img) {
        const newImg = new Image();
        newImg.onload = () => {
          const row = Math.floor((i-1) / 3);
          const col = (i-1) % 3;
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          
          // 둥근 모서리로 이미지 그리기
          ctx.save();
          drawRoundedRect(ctx, x, y, cellSize, cellSize, radius);
          ctx.clip();
          ctx.drawImage(newImg, x, y, cellSize, cellSize);
          ctx.restore();
          
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
  const isLightColor = ['yellow'].includes(currentColor);
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
    showLoading(t('alert.loading_history'));
    
    const response = await axios.get(`/api/history/${currentUser}?limit=20`);
    const { collages } = response.data;
    
    hideLoading();
    
    // 현재 배경색 유지 (오늘의 색이 있으면 사용, 없으면 기본 회색)
    const colorInfo = currentColor ? COLORS[currentColor] : null;
    const backgroundColor = colorInfo ? colorInfo.hex : '#F9FAFB';
    const isLightColor = currentColor ? ['yellow', 'white'].includes(currentColor) : true;
    const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
    
    // 배경색 적용
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.color = textColor;
    
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="clean-history-screen animate-fade-in" style="color: ${textColor};">
        <!-- 상단 네비게이션 -->
        <div class="history-header">
          <button onclick="checkCurrentSession()" class="history-back-btn">
            <i class="fas fa-arrow-left"></i>
          </button>
          <h1 class="history-title">${t('management.my_collage_history')}</h1>
        </div>
        
        ${collages.length === 0 ? `
          <!-- 빈 상태 - 이미지와 동일한 디자인 -->
          <div class="empty-history-content">
            <div class="empty-message">
              <h2 class="empty-title">${t('management.no_completed_collages')}</h2>
            </div>
            <button onclick="startColorHuntDirectly()" class="find-color-btn">
              ${t('management.create_first_collage')}
            </button>
          </div>
        ` : `
          <!-- 콜라주 목록 -->
          <div class="history-collages">
            ${collages.map(collage => `
              <div class="history-collage-item" style="border-color: rgba(255,255,255,0.3);">
                <div class="collage-preview">
                  <img src="${collage.collage_data}" alt="${collage.color} collage">
                </div>
                <div class="collage-info">
                  <div class="collage-color">${COLORS[collage.color]?.english || collage.color}</div>
                  <div class="collage-date">${collage.date}</div>
                  <button onclick="downloadCollage('${collage.collage_data}')" class="download-btn">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    
  } catch (error) {
    console.error('History loading error:', error);
    hideLoading();
    showError(t('alert.failed_load_history'));
  }
}

// 바로 컬러 헌트 시작 (히스토리에서 호출)
async function startColorHuntDirectly() {
  try {
    showLoading(t('alert.loading_color'));
    
    // 랜덤 컬러 선택
    const response = await axios.post('/api/color/random', {
      user_id: currentUser
    });
    
    const { color } = response.data;
    currentColor = color;
    
    hideLoading();
    
    // 오늘 날짜 생성
    const today = new Date().toISOString().split('T')[0];
    
    // 컬러 확인 화면으로 바로 이동 (confirm 버튼만 누르면 시작)
    // color 응답이 이미 { name, hex, english, korean } 형태라고 가정
    showColorConfirmationScreen(color, today);
    
  } catch (error) {
    console.error('컬러 선택 오류:', error);
    hideLoading();
    showError(t('alert.failed_fetch_color'));
  }
}

// 다국어 시스템 함수들

// 스프레드시트에서 다국어 데이터 로드
async function loadI18nData() {
  try {
    // 로컬 CSV 파일에서 번역 데이터 로드
    const csvUrl = '/static/translations.csv';
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    // CSV 파싱하여 i18nData 구조 생성
    parseCSVToI18n(csvText);
    isI18nLoaded = true;
    
    console.log('📚 다국어 데이터 로드 완료:', Object.keys(i18nData));
    console.log('📝 영어 키 개수:', Object.keys(i18nData.en).length);
    console.log('📝 한국어 키 개수:', Object.keys(i18nData.ko).length);
    console.log('📝 샘플 한국어 텍스트:', i18nData.ko['main.whats_today_color']);
    
  } catch (error) {
    console.error('❌ 다국어 데이터 로드 실패:', error);
    
    // CSV 로드 실패 시 기본 번역 데이터 사용
    loadFallbackTranslations();
    isI18nLoaded = true;
  }
}

// 기본 번역 데이터 (CSV 로드 실패 시 사용) - 업데이트된 번역 반영
function loadFallbackTranslations() {
  i18nData = {
    en: {
      'main.whats_today_color': 'Let\'s Color Hunt together!',
      'main.discover_color': '1. Check your color of today\n2. Hunt your color during day\n3. Share it',
      'main.start': 'Hunt',
      'main.choose_mode': 'Choose Your Mode',
      'main.nine_mode': 'Sqaure Mode',
      'main.unlimited_mode': 'Unlimited Mode (15 photos)',
      'color.today_color_is': 'Today\'s color is',
      'color.red': 'Red',
      'color.orange': 'Peach',
      'color.yellow': 'Yellow',
      'color.green': 'Green',
      'color.blue': 'Blue',
      'color.indigo': 'Purple',
      'color.purple': 'Violet',

      'color.black': 'Black',
      'color.what_is_your_color': 'What is your {{color}}?',
      'color.get_another_color': 'Get Another Color',
      'camera.capture_photo': 'Capture Photo',
      'camera.retake_photo': 'Retake',
      'camera.next_photo': 'Next Photo',
      'camera.complete_collage': 'Complete',
      'collage.collage_completed': 'Completed!',
      'collage.share_collage': 'Share ',
      'collage.save_collage': 'Save to Gallery',
      'collage.create_new_collage': 'Create New',
      'collage.complete_collage': 'Complete',
      'alert.loading': 'Loading...',
      'alert.loading_session': 'Loading session...',
      'alert.loading_color': 'Loading color...',
      'alert.loading_history': 'Loading history...',
      'alert.failed_start_session': 'Failed to start session',
      'alert.failed_fetch_color': 'Failed to fetch color',
      'alert.failed_load_history': 'Failed to load history',
      'alert.upload_error': 'Failed to upload photo',
      'alert.complete_error': 'Failed to complete',
      'management.no_completed_collages': 'Hunt your first color !',
      'management.reset': 'Reset ',
      'management.history': 'History',
      'management.my_collage_history': 'My History',
      'management.create_first_collage': 'Create your first !',
      'picture.back': 'Back',
      'picture.delete': 'Delete',
      'picture.take_photo': 'Take Photo',
      'picture.take_picture': 'Take Picture {{number}}',
      'alert.take_all_photos': 'Take at least 9 photos to complete ({{count}}/9)'
    },
    ko: {
      'main.whats_today_color': '함께 컬러헌트해요!',
      'main.discover_color': '1. 오늘의 색깔을 확인하세요\n2. 하루 종일 색깔을 찾아보세요\n3. 공유해보세요',
      'main.start': '시작하기',
      'main.choose_mode': '모드를 선택하세요',
      'main.nine_mode': '정방형 모드',
      'main.unlimited_mode': '무제한 모드 (15장)',
      'color.today_color_is': '오늘의 색깔은',
      'color.red': '빨강',
      'color.orange': '주황',
      'color.yellow': '노랑',
      'color.green': '초록',
      'color.blue': '파랑',
      'color.indigo': '보라',
      'color.purple': '자주',

      'color.black': '검정',
      'color.what_is_your_color': '당신의 {{color}}은 무엇인가요?',
      'color.get_another_color': '다른 색깔 받기',
      'camera.capture_photo': '사진 촬영',
      'camera.retake_photo': '다시 촬영',
      'camera.next_photo': '다음 사진',
      'camera.complete_collage': '완성',
      'collage.collage_completed': '완성!',
      'collage.share_collage': '공유',
      'collage.save_collage': '갤러리에 저장',
      'collage.create_new_collage': '시작',
      'collage.complete_collage': '완성',
      'alert.loading': '로딩 중...',
      'alert.loading_session': '세션 로딩 중...',
      'alert.loading_color': '색깔 로딩 중...',
      'alert.loading_history': '히스토리 로딩 중...',
      'alert.failed_start_session': '세션 시작에 실패했습니다',
      'alert.failed_fetch_color': '색깔 가져오기에 실패했습니다',
      'alert.failed_load_history': '히스토리 로드에 실패했습니다',
      'alert.upload_error': '사진 업로드에 실패했습니다',
      'alert.complete_error': '완성에 실패했습니다',
      'management.no_completed_collages': 'Hunt your first color !',
      'management.reset': '초기화',
      'management.history': '히스토리',
      'management.my_collage_history': '히스토리',
      'management.create_first_collage': '첫 번째 만들어보세요!',
      'picture.back': '뒤로가기',
      'picture.delete': '삭제',
      'picture.take_photo': '사진 촬영',
      'picture.take_picture': '{{number}}번째 사진 촬영',
      'alert.take_all_photos': '완성하려면 최소 9장 필요 ({{count}}/9)'
    }
  };
  
  console.log('📚 기본 번역 데이터 로드됨 (fallback)');
}

// CSV 데이터를 i18n 구조로 파싱 (헤더 없는 key,value_en,value_ko 형태)
function parseCSVToI18n(csvText) {
  const lines = csvText.split('\n');
  
  i18nData = {
    en: {},
    ko: {}
  };
  
  // 데이터 행 처리 (헤더 없음)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line);
    
    if (columns.length >= 3) {
      const key = columns[0]?.trim();
      let enValue = columns[1]?.trim().replace(/^"|"$/g, '') || '';
      let koValue = columns[2]?.trim().replace(/^"|"$/g, '') || '';
      
      // \n을 실제 줄바꿈으로 변환
      enValue = enValue.replace(/\\n/g, '\n');
      koValue = koValue.replace(/\\n/g, '\n');
      
      if (key) {
        if (enValue) i18nData.en[key] = enValue;
        if (koValue) i18nData.ko[key] = koValue;
      }
    }
  }
}

// 간단한 CSV 라인 파서 (콤마와 따옴표 처리)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// 다국어 텍스트 가져오기 (t 함수)
function t(key, params = {}) {
  if (!isI18nLoaded) {
    // 로딩 중이면 키를 그대로 반환
    return key;
  }
  
  const langData = i18nData[currentLanguage] || i18nData.en;
  let text = langData[key];
  
  // 현재 언어에 없으면 영어 폴백
  if (!text && currentLanguage !== 'en') {
    text = i18nData.en[key];
  }
  
  // 여전히 없으면 키 자체 반환
  if (!text) {
    console.warn(`⚠️ Missing translation: ${key} (${currentLanguage})`);
    return key;
  }
  
  // 플레이스홀더 치환
  return replacePlaceholders(text, params);
}

// 플레이스홀더 치환 ({{key}} 형태)
function replacePlaceholders(text, params) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

// 언어 변경
function setLanguage(lang) {
  if (lang === currentLanguage) return;
  
  currentLanguage = lang;
  localStorage.setItem('colorhunt_language', lang);
  
  // 현재 화면 새로고침 (다국어 적용)
  if (isI18nLoaded) {
    refreshCurrentScreen();
  }
}

// 현재 화면 새로고침
function refreshCurrentScreen() {
  // 현재 상태에 따라 적절한 화면 다시 표시
  if (currentSession && currentSession.status === 'in_progress') {
    showCollageScreen();
  } else {
    checkCurrentSession();
  }
}

// 언어 토글
function toggleLanguage() {
  const newLang = currentLanguage === 'en' ? 'ko' : 'en';
  setLanguage(newLang);
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