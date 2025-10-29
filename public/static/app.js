// Color Hunt - 메인 애플리케이션

// 전역 상태
let currentUser = null;
let currentSession = null;
let currentColor = null;
let photoCount = 0;
let mediaStream = null;
let gameMode = 'unlimited'; // 15장 모드로 통일

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
let isI18nLoaded = true; // 즉시 사용 가능

// 컬러 정보 (백엔드와 동기화됨) - 하얀색 제외
const COLORS = {
  red: { hex: '#D72638', english: 'Red', korean: '빨강' },
  orange: { hex: '#FF8C42', english: 'Orange', korean: '주황' },
  yellow: { hex: '#F4B400', english: 'Yellow', korean: '노랑' },
  green: { hex: '#2E8B57', english: 'Green', korean: '초록' },
  blue: { hex: '#007ACC', english: 'Blue', korean: '파랑' },
  purple: { hex: '#6C2DC7', english: 'Purple', korean: '보라' },
  // white: { hex: '#FEFEFE', english: 'White', korean: '흰색' }, // 제외: 텍스트 가독성
  black: { hex: '#2D2D2D', english: 'Black', korean: '검정' },
  pink: { hex: '#E75480', english: 'Pink', korean: '분홍' },
  tan: { hex: '#A67C52', english: 'Tan', korean: '황갈색' },
  beige: { hex: '#8B5E3C', english: 'French Beige', korean: '베이지' },
  matcha: { hex: '#82A860', english: 'Matcha', korean: '말차' }
};

// 앱 초기화 - 기존 간단한 시스템으로 원복
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎨 Color Hunt 앱 시작!');
  
  // 사용자 ID 설정 (Safari 보호 강화)
  currentUser = await getUserId();
  
  // 다국어 데이터 로드
  showLoading('Loading...');
  loadFallbackTranslations(); // 즉시 로드
  await loadI18nData();
  hideLoading();
  
  // 기존 라우터 및 세션 체크
  const routeResult = initRouter();
  handleRouteResult(routeResult);
});

// 기존 인증 로직 제거됨 - 간단한 getUserId() 기반으로 원복

// 인증 화면 제거됨 - 기존 간단한 시스템으로 원복

// 사용자 ID 관리 (Safari 보호 강화)
async function getUserId() {
  // 1단계: localStorage에서 확인
  let userId = localStorage.getItem('colorhunt_user_id');
  
  if (userId) {
    console.log('✅ localStorage에서 사용자 ID 복구:', userId);
    return userId;
  }
  
  // 2단계: IndexedDB에서 사용자 ID 복구 시도 (Safari 보호)
  if (typeof ColorHuntSessionDB !== 'undefined') {
    try {
      const sessionDB = new ColorHuntSessionDB();
      const savedUserId = await sessionDB.getUserId();
      if (savedUserId) {
        console.log('✅ IndexedDB에서 사용자 ID 복구:', savedUserId);
        localStorage.setItem('colorhunt_user_id', savedUserId);
        return savedUserId;
      }
    } catch (e) {
      console.warn('⚠️ IndexedDB 사용자 ID 복구 실패:', e.message);
    }
  }
  
  // 3단계: 새로운 사용자 ID 생성 및 양쪽에 저장
  userId = 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  console.log('🆕 새로운 사용자 ID 생성:', userId);
  
  localStorage.setItem('colorhunt_user_id', userId);
  
  // IndexedDB에도 백업 (Safari 보호)
  if (typeof ColorHuntSessionDB !== 'undefined') {
    try {
      const sessionDB = new ColorHuntSessionDB();
      await sessionDB.saveUserId(userId);
      console.log('💾 사용자 ID IndexedDB 백업 완료');
    } catch (e) {
      console.warn('⚠️ 사용자 ID IndexedDB 백업 실패:', e.message);
    }
  }
  
  return userId;
}

// 🔗 라우터 시스템 - 하이브리드 구조 Smart Redirection
function initRouter() {
  const path = window.location.pathname;
  console.log(`🔗 현재 경로: ${path}`);
  
  // URL 패턴 매칭
  if (path === '/' || path === '') {
    // 메인 페이지 - 항상 허용
    return 'main';
  } else if (path.startsWith('/color/') && !path.startsWith('/color/') + '/') {
    // /color/red → 색상 확인 화면 (0장)
    const colorName = path.split('/color/')[1];
    return handleColorConfirmAccess(colorName);
  } else if (path.startsWith('/progress/')) {
    // /progress/red/3 → 진행 중 (3장)
    const parts = path.split('/');
    if (parts.length >= 4) {
      const colorName = parts[2];
      const photoCount = parseInt(parts[3]) || 0;
      return handleProgressPageAccess(colorName, photoCount);
    }
  } else if (path.startsWith('/complete/')) {
    // /complete/red → 완성 화면
    const colorName = path.split('/complete/')[1];
    return handleCompletePageAccess(colorName);
  } else if (path === '/history') {
    // 이력 페이지 - 항상 허용
    return 'history';
  }
  
  // 알 수 없는 경로 - 메인으로 리디렉션
  console.log('❌ 알 수 없는 경로, 메인으로 리디렉션');
  navigateToMain();
  return 'main';
}

// Smart Redirection 핸들러들 - 하이브리드 구조
function handleColorConfirmAccess(colorName) {
  const hasActiveSession = checkActiveSession();
  const isDirectAccess = !document.referrer.includes(window.location.origin);
  
  console.log(`🎨 색상 확인 접근: ${colorName}, 세션: ${hasActiveSession}, 직접접근: ${isDirectAccess}`);
  
  // 활성 세션이 있고 이미 사진이 있으면 progress로 리디렉션
  if (hasActiveSession && currentColor === colorName && photoCount > 0) {
    console.log(`🔄 진행 중인 세션 감지 - progress로 리디렉션 (${photoCount}장)`);
    navigateToProgress(colorName, photoCount);
    return { type: 'progress', color: colorName, count: photoCount };
  }
  
  // 직접 접근이면서 다른 색상 세션이 있는 경우
  if (isDirectAccess && hasActiveSession && currentColor !== colorName) {
    console.log(`⚠️ 다른 색상 세션 진행 중 - 기존 세션으로 리디렉션`);
    navigateToProgress(currentColor, photoCount);
    return { type: 'progress', color: currentColor, count: photoCount };
  }
  
  console.log('✅ 색상 확인 화면 진입');
  return { type: 'color_confirm', color: colorName };
}

function handleProgressPageAccess(colorName, requestedCount) {
  const hasActiveSession = checkActiveSession();
  const sessionPhotoCount = photoCount || 0;
  
  console.log(`📊 진행 페이지 접근: ${colorName}/${requestedCount}, 세션: ${hasActiveSession}, 실제: ${sessionPhotoCount}장`);
  
  // 세션이 없으면 메인으로
  if (!hasActiveSession) {
    console.log('⚠️ 활성 세션 없음 - 메인으로 리디렉션');
    navigateToMain();
    return 'main';
  }
  
  // 색상이 다르면 실제 세션으로 리디렉션
  if (currentColor !== colorName) {
    console.log(`⚠️ 색상 불일치 - 실제 세션으로 리디렉션: ${currentColor}`);
    navigateToProgress(currentColor, sessionPhotoCount);
    return { type: 'progress', color: currentColor, count: sessionPhotoCount };
  }
  
  // 사진 수가 다르면 실제 상태로 리디렉션
  if (sessionPhotoCount !== requestedCount) {
    console.log(`🔄 사진 수 불일치 - 실제 상태로 리디렉션: ${sessionPhotoCount}장`);
    navigateToProgress(colorName, sessionPhotoCount);
    return { type: 'progress', color: colorName, count: sessionPhotoCount };
  }
  
  console.log('✅ 진행 페이지 정상 진입');
  return { type: 'progress', color: colorName, count: requestedCount };
}

function handleCompletePageAccess(colorName) {
  const hasActiveSession = checkActiveSession();
  const isDirectAccess = !document.referrer.includes(window.location.origin);
  
  console.log(`🎉 완성 페이지 접근: ${colorName}, 세션: ${hasActiveSession}, 직접접근: ${isDirectAccess}`);
  
  // 직접 접근이면서 세션이 없거나 색상이 다른 경우
  if (isDirectAccess && (!hasActiveSession || currentColor !== colorName)) {
    console.log('⚠️ 직접 접근 차단 - 메인으로 리디렉션');
    navigateToMain();
    return 'main';
  }
  
  // 세션은 있지만 완성되지 않은 경우
  if (hasActiveSession && currentColor === colorName && photoCount < 15) {
    console.log(`🔄 미완성 세션 - 진행 화면으로 리디렉션 (${photoCount}장)`);
    navigateToProgress(colorName, photoCount);
    return { type: 'progress', color: colorName, count: photoCount };
  }
  
  console.log('✅ 완성 페이지 정상 진입');
  return { type: 'complete', color: colorName };
}

// 활성 세션 체크 (동기 버전)
function checkActiveSession() {
  try {
    const cachedSession = localStorage.getItem('colorhunt_current_session');
    if (!cachedSession) return false;
    
    const session = JSON.parse(cachedSession);
    const sessionAge = Date.now() - new Date(session.created_at).getTime();
    return sessionAge < 24 * 60 * 60 * 1000 && session.status === 'in_progress';
  } catch (e) {
    console.error('세션 체크 오류:', e);
    return false;
  }
}

// 🧭 네비게이션 함수들 - 하이브리드 구조
function navigateToMain() {
  if (window.location.pathname !== '/') {
    console.log('📍 메인 페이지로 리디렉션');
    window.history.replaceState(null, '', '/');
    trackPageView('/');
  }
}

function navigateToColorConfirm(colorName) {
  const newPath = `/color/${colorName}`;
  console.log(`📍 색상 확인 페이지로 이동: ${newPath}`);
  window.history.pushState({ 
    type: 'color_confirm', 
    color: colorName 
  }, '', newPath);
  trackPageView(newPath);
}

function navigateToProgress(colorName, photoCount) {
  const newPath = `/progress/${colorName}/${photoCount}`;
  console.log(`📍 진행 페이지로 이동: ${newPath} (${photoCount}장)`);
  window.history.pushState({ 
    type: 'progress', 
    color: colorName, 
    count: photoCount 
  }, '', newPath);
  trackPageView(newPath, { photo_count: photoCount });
}

function navigateToComplete(colorName) {
  const newPath = `/complete/${colorName}`;
  console.log(`📍 완성 페이지로 이동: ${newPath}`);
  window.history.pushState({ 
    type: 'complete', 
    color: colorName 
  }, '', newPath);
  trackPageView(newPath);
}

function navigateToHistory() {
  const newPath = '/history';
  console.log(`📍 히스토리 페이지로 이동: ${newPath}`);
  window.history.pushState({ page: 'history' }, '', newPath);
  trackPageView(newPath);
}

// 기존 호환성을 위한 래퍼 함수들
function navigateToColor(colorName) {
  navigateToColorConfirm(colorName);
}

// 📊 GA 트래킹 함수
function trackPageView(path) {
  try {
    if (typeof gtag !== 'undefined') {
      console.log(`📊 GA 페이지뷰 전송: ${path}`);
      gtag('event', 'page_view', {
        page_path: path,
        page_title: getPageTitle(path),
        page_location: window.location.href,
        color_name: currentColor || 'none',
        session_id: currentSession?.sessionId || 'none'
      });
    } else {
      console.log(`📊 GA 미설정 - 페이지뷰 무시: ${path}`);
    }
  } catch (error) {
    console.error('GA 트래킹 오류:', error);
  }
}

function getPageTitle(path) {
  if (path === '/') return 'Color Hunt - Home';
  if (path.startsWith('/color/')) return `Color Hunt - ${path.split('/')[2]} Confirm`;
  if (path.startsWith('/progress/')) {
    const parts = path.split('/');
    return `Color Hunt - ${parts[2]} Progress (${parts[3] || 0} photos)`;
  }
  if (path.startsWith('/complete/')) return `Color Hunt - ${path.split('/')[2]} Complete`;
  if (path === '/history') return 'Color Hunt - History';
  return 'Color Hunt';
}

// 라우트 결과 처리 - 하이브리드 구조
function handleRouteResult(routeResult) {
  if (typeof routeResult === 'string') {
    if (routeResult === 'main') {
      checkCurrentSession(); // 기존 메인 로직
    } else if (routeResult === 'history') {
      showHistoryScreen();
    }
  } else if (typeof routeResult === 'object') {
    switch (routeResult.type) {
      case 'color_confirm':
        // 색상 확인 화면
        showColorConfirmationScreen(routeResult.color);
        break;
      case 'progress':
        // 진행 화면 - 세션 복원 후 콜라주 화면
        restoreProgressSession(routeResult.color, routeResult.count);
        break;
      case 'complete':
        // 완성 화면 - 완성된 콜라주 표시
        restoreCompleteSession(routeResult.color);
        break;
      default:
        console.log('알 수 없는 라우트 타입:', routeResult.type);
        navigateToMain();
    }
  }
}

// 세션 복원 함수들 - 하이브리드 구조
async function restoreProgressSession(colorName, expectedCount) {
  console.log(`🔄 진행 세션 복원: ${colorName}, 예상 ${expectedCount}장`);
  
  // 현재 세션 복원
  await checkCurrentSession();
  
  // 실제 상태와 URL이 일치하는지 확인
  const actualCount = photoCount || 0;
  if (actualCount !== expectedCount || currentColor !== colorName) {
    console.log(`🔄 상태 불일치 감지 - URL 업데이트: ${actualCount}장`);
    navigateToProgress(currentColor, actualCount);
  }
}

async function restoreCompleteSession(colorName) {
  console.log(`🔄 완성 세션 복원: ${colorName}`);
  
  // 완성된 콜라주 데이터 조회 필요
  try {
    const response = await axios.get(`/api/history/${currentUser}?limit=1&color=${colorName}`);
    const { collages } = response.data;
    
    if (collages && collages.length > 0) {
      const latestCollage = collages[0];
      showCompletedScreen(latestCollage.collage_data);
    } else {
      console.log('⚠️ 완성된 콜라주 없음 - 메인으로 이동');
      navigateToMain();
      checkCurrentSession();
    }
  } catch (error) {
    console.error('완성 세션 복원 오류:', error);
    navigateToMain();
    checkCurrentSession();
  }
}

function showColorConfirmationScreen(colorName) {
  // 색상 확인 화면을 표시하는 기존 함수가 있는지 확인
  // 없다면 색상 선택 화면을 표시
  if (typeof getNewColor === 'function') {
    getNewColor(); // 새 색상 가져오기
  } else {
    showColorSelectionScreen(); // 기존 색상 선택 화면
  }
}

// 🔙 뒤로가기 이벤트 핸들링
window.addEventListener('popstate', (event) => {
  console.log('🔙 뒤로가기 감지:', event.state);
  const routeResult = initRouter();
  handleRouteResult(routeResult);
});

// 현재 세션 확인 (캐싱 최적화)
async function checkCurrentSession() {
  try {
    console.log('🔍 세션 복구 시작 - 3단계 fallback 시스템');
    
    // 1단계: localStorage에서 세션 복구 시도
    const cachedSession = localStorage.getItem('colorhunt_current_session');
    let session = null;
    
    if (cachedSession) {
      try {
        session = JSON.parse(cachedSession);
        
        // 🚨 세션 복구 조건 강화 (완료된 세션 제외)
        const isInProgressSession = session && session.status === 'in_progress';
        const isNotCompleted = session && session.status !== 'completed';
        const hasPhotos = session.photos && session.photos.length > 0;
        const hasIncompletePhotos = hasPhotos && session.photos.length < 15; // 15장 미만만 복구
        
        // 완료된 세션 명시적 제외
        if (session && session.status === 'completed') {
          console.log('⚠️ 완료된 세션은 복구하지 않음:', session.color);
          localStorage.removeItem('colorhunt_current_session'); // 완료된 세션 정리
          return; // 복구 중단
        }
        
        // 세션 날짜가 있으면 24시간 체크, 없으면 사진 여부로 판단
        let isWithinTimeLimit = true;
        if (session.created_at) {
          const sessionAge = Date.now() - new Date(session.created_at).getTime();
          isWithinTimeLimit = sessionAge < 24 * 60 * 60 * 1000;
        }
        
        if (isInProgressSession && isNotCompleted && (isWithinTimeLimit || hasIncompletePhotos)) {
          console.log('✅ 1단계: localStorage에서 세션 복구 성공');
          currentSession = session;
          currentColor = session.color;
          updateThemeColor(currentColor);
          photoCount = session.photos?.length || 0;
          gameMode = 'unlimited'; // 15장 모드로 통일
          showCollageScreen();
          return;
        }
      } catch (e) {
        console.warn('⚠️ localStorage 세션 파싱 실패:', e.message);
        // 위험한 localStorage.removeItem() 제거 - 데이터 보존
      }
    }
    
    // 2단계: IndexedDB에서 세션 복구 시도 (Safari 보호)
    if (typeof ColorHuntSessionDB !== 'undefined') {
      try {
        const sessionDB = new ColorHuntSessionDB();
        const indexedSession = await sessionDB.getSession(currentUser);
        
        // 🚨 IndexedDB 완료된 세션 제외 강화
        if (indexedSession && indexedSession.status === 'completed') {
          console.log('⚠️ IndexedDB 완료된 세션은 복구하지 않음:', indexedSession.color);
          await sessionDB.clearCompletedSession(currentUser); // IndexedDB에서도 완료된 세션 정리
          return; // 복구 중단
        }
        
        if (indexedSession && indexedSession.status === 'in_progress') {
          
          // IndexedDB에서 개별 사진들도 복구 시도
          const savedPhotos = await sessionDB.getAllPhotos(currentUser);
          if (savedPhotos && savedPhotos.length > 0) {
            indexedSession.photos = savedPhotos;
            console.log(`🖼️ IndexedDB에서 ${savedPhotos.length}장의 사진 복구`);
          }
          
          // 🚨 15장 미만인 경우만 복구
          const hasIncompletePhotos = indexedSession.photos && indexedSession.photos.length < 15;
          let isWithinTimeLimit = true;
          if (indexedSession.created_at) {
            const sessionAge = Date.now() - new Date(indexedSession.created_at).getTime();
            isWithinTimeLimit = sessionAge < 24 * 60 * 60 * 1000;
          }
          
          if ((isWithinTimeLimit || hasIncompletePhotos) && hasIncompletePhotos) {
            console.log('✅ 2단계: IndexedDB에서 세션 복구 성공 (Safari 보호)');
            // localStorage에도 백업
            localStorage.setItem('colorhunt_current_session', JSON.stringify(indexedSession));
            currentSession = indexedSession;
            currentColor = indexedSession.color;
            updateThemeColor(currentColor);
            photoCount = indexedSession.photos?.length || 0;
            gameMode = 'unlimited'; // 15장 모드로 통일
            showCollageScreen();
            return;
          } else {
            console.log('⚠️ IndexedDB 세션이 너무 오래됨 또는 사진 없음');
          }
        } else {
          console.log('ℹ️ IndexedDB에 유효한 세션 없음');
        }
        
        // 세션이 없어도 개별 사진들로부터 세션 재구성 시도 (강력한 복구)
        console.log('🔄 개별 사진으로부터 세션 재구성 시도...');
        try {
          const sessionDB = new ColorHuntSessionDB();
          const savedPhotos = await sessionDB.getAllPhotos(currentUser);
          if (savedPhotos && savedPhotos.length > 0) {
            console.log(`🔄 개별 사진들로부터 세션 재구성: ${savedPhotos.length}장`);
            
            // 가장 최근 사진의 색상과 세션 정보 사용
            const recentPhoto = savedPhotos.sort((a, b) => b.timestamp - a.timestamp)[0];
            
            const reconstructedSession = {
              sessionId: recentPhoto.sessionId || ('recovered_' + Date.now()),
              user_id: currentUser,
              color: recentPhoto.color,
              status: 'in_progress',
              mode: 'unlimited',
              photos: savedPhotos,
              created_at: recentPhoto.created_at,
              reconstructed: true // 재구성된 세션임을 표시
            };
            
            console.log('✅ 2단계-보완: 개별 사진으로부터 세션 재구성 성공');
            localStorage.setItem('colorhunt_current_session', JSON.stringify(reconstructedSession));
            currentSession = reconstructedSession;
            currentColor = reconstructedSession.color;
            updateThemeColor(currentColor);
            photoCount = reconstructedSession.photos.length;
            gameMode = reconstructedSession.mode;
            showCollageScreen();
            return;
          } else {
            console.log('ℹ️ 개별 사진도 없음 - 서버에서 확인 필요');
          }
        } catch (e) {
          console.warn('⚠️ 개별 사진으로부터 세션 재구성 실패:', e.message);
        }
        
      } catch (e) {
        console.warn('⚠️ IndexedDB 세션 복구 실패:', e.message);
      }
    }
    
    // 3단계: 서버에서 세션 복구 시도 (최후 수단)
    console.log('🌐 3단계: 서버에서 세션 복구 시도');
    showLoading(t('alert.loading_session'));
    
    const response = await axios.get(`/api/session/current/${currentUser}`);
    const serverResponse = response.data;
    session = serverResponse.session;
    
    // 서버에서 받은 세션을 모든 저장소에 백업 (Safari 보호)
    if (session && session.status === 'in_progress') {
      console.log('✅ 3단계: 서버에서 세션 복구 성공');
      
      // localStorage에 저장
      localStorage.setItem('colorhunt_current_session', JSON.stringify(session));
      
      // IndexedDB에도 백업 (Safari ITP 보호)
      if (typeof ColorHuntSessionDB !== 'undefined') {
        try {
          const sessionDB = new ColorHuntSessionDB();
          await sessionDB.saveSession(currentUser, session);
          console.log('💾 IndexedDB에 세션 백업 완료');
        } catch (e) {
          console.warn('⚠️ IndexedDB 백업 실패:', e.message);
        }
      }
    } else {
      console.log('ℹ️ 진행 중인 세션 없음 - 새 세션 시작');
    }
    
    hideLoading();
    
    if (session && session.status === 'in_progress') {
      // 진행 중인 세션이 있으면 콜라주 화면으로
      currentSession = session;
      currentColor = session.color;
      updateThemeColor(currentColor); // 상태바 색상 업데이트
      photoCount = session.photos?.length || 0;
      gameMode = 'unlimited'; // 15장 모드로 통일
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

// 컬러 선택 화면 (메인 화면)
function showColorSelectionScreen() {
  // 배경색을 연한 파란색으로 변경
  document.body.style.backgroundColor = '#E9EEFA';
  document.body.style.color = '#374151';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="main-container min-h-screen relative flex items-center justify-center p-4">
      <!-- 메인 배경 이미지 레이어 -->
      <div class="main-background absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40" 
           style="background-image: url('/static/collage-background.jpg');">
        <!-- 그라디언트 오버레이 -->
        <div class="absolute inset-0 bg-gradient-to-b from-blue-50/60 to-blue-100/60"></div>
      </div>
      
      <!-- 콘텐츠 레이어 - 박스 제거하고 직접 배치 -->
      <div class="main-content relative text-center animate-fade-in max-w-md w-full">
        <h1 class="text-4xl font-bold mb-8 drop-shadow-lg" style="color: #0A18B1;">${t('main.whats_today_color')}</h1>
        
        <div class="text-lg leading-relaxed whitespace-pre-line mb-8 drop-shadow-md" style="color: #3445FF;">
          ${t('main.discover_color')}
        </div>
        
        <button onclick="getNewColor()" class="btn btn-primary mb-6 w-full py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold backdrop-blur-sm border border-white/50" style="background-color: #3445FF; color: #ffffff; border-color: #3445FF;">
          ${t('main.start')}
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
        <button onclick="startUnlimitedMode()" class="btn btn-${buttonStyle} w-full py-4 text-lg">
          <i class="fas fa-camera mr-2"></i>
          ${t('main.start_hunt')}
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
    navigateToProgress(currentColor, 0);
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
  
  // 15장 모드로 통일
  showUnlimitedCollageScreen();
}

// 15개 모드 콜라주 화면 (3x5 레이아웃)
function showNineCollageScreen() {
  const colorInfo = COLORS[currentColor];
  
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
        
        <!-- 진행률 표시 제거됨 -->
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
          <button onclick="navigateToHistory(); showHistoryScreen()" class="text-action-btn">
            ${t('management.history')}
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
          ${t('picture.take_photo', { number: '' })}
        </button>
      </div>
      
      <!-- 15개 사진 그리드 (3x5) -->
      <div class="unlimited-photo-grid" id="photoGrid">
        ${generateUnlimitedPhotoGrid()}
      </div>
      
      <!-- 하단 액션 -->
      <div class="unlimited-actions">
        ${photoCount >= 15 ? `
          <button onclick="completeCollage()" class="complete-action-btn" style="background-color: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.8);">
            ${t('collage.complete_collage')}
          </button>
        ` : ``}
        
        <div class="secondary-actions">
          <button onclick="resetSession()" class="text-action-btn">
            ${t('management.reset')}
          </button>
          <button onclick="navigateToHistory(); showHistoryScreen()" class="text-action-btn">
            ${t('management.history')}
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

// 15개 모드 그리드 생성 (3x5 레이아웃) - 카메라 아이콘 제거
function generateNinePhotoGrid() {
  let gridHTML = '';
  
  for (let i = 1; i <= 15; i++) {
    gridHTML += `
      <div class="photo-slot" id="slot-${i}" onclick="handleSlotClick(${i})">
        <!-- 빈 슬롯 (카메라 아이콘 제거) -->
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
    if (nextSlot <= 15) { // 9 → 15로 수정
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
  for (let i = 1; i <= 15; i++) { // 9 → 15로 수정
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
  
  // 정방형 카메라 인터페이스 (색상 배경)
  const app = document.getElementById('app');
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  
  app.innerHTML = `
    <div class="square-camera-screen animate-fade-in" style="background-color: ${colorInfo.hex}; color: ${textColor};">
      <!-- 상단 닫기 버튼만 -->
      <div class="square-camera-header">
        <button onclick="closeCameraView()" class="square-camera-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- 정방형 카메라 프리뷰 -->
      <div class="square-camera-container">
        <div class="square-preview-frame">
          <video id="cameraPreview" class="square-video" autoplay playsinline></video>
        </div>
      </div>
      
      <!-- 하단 촬영 버튼 -->
      <div class="square-camera-footer">
        <button onclick="capturePhoto(${position})" class="square-capture-btn">
          <div class="square-capture-circle">
            <div class="square-capture-inner"></div>
          </div>
        </button>
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

// 사진 촬영 (정방형 크롭 및 리사이징)
function capturePhoto(position) {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('captureCanvas');
  
  if (!video || !canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // 정방형 크롭 계산
  const size = Math.min(video.videoWidth, video.videoHeight);
  const x = (video.videoWidth - size) / 2;
  const y = (video.videoHeight - size) / 2;
  
  // 원본 이미지 (정방형, 적당한 크기로 리사이징)
  const originalSize = 800; // 800x800으로 제한 (Storage 문제 해결)
  canvas.width = originalSize;
  canvas.height = originalSize;
  
  // 정방형으로 크롭하여 원본 생성
  ctx.drawImage(video, x, y, size, size, 0, 0, originalSize, originalSize);
  const imageData = canvas.toDataURL('image/jpeg', 0.85); // 품질 85%
  
  // 썸네일 생성 (200x200)
  const thumbnailSize = 200;
  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = thumbnailSize;
  thumbnailCanvas.height = thumbnailSize;
  const thumbCtx = thumbnailCanvas.getContext('2d');
  
  // 동일한 정방형 크롭으로 썸네일 생성
  thumbCtx.drawImage(video, x, y, size, size, 0, 0, thumbnailSize, thumbnailSize);
  const thumbnailData = thumbnailCanvas.toDataURL('image/jpeg', 0.8); // 품질 80%
  
  console.log(`📸 Photo captured: Original=${originalSize}x${originalSize}, Thumbnail=${thumbnailSize}x${thumbnailSize}`);
  
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
    
    // 업데이트된 세션을 모든 저장소에 백업 (Safari 보호)
    localStorage.setItem('colorhunt_current_session', JSON.stringify(currentSession));
    
    // IndexedDB에 자동 백업 (Safari ITP 보호)
    if (typeof ColorHuntSessionDB !== 'undefined') {
      try {
        const sessionDB = new ColorHuntSessionDB();
        
        // 세션 전체 백업
        await sessionDB.saveSession(currentUser, currentSession);
        
        // 개별 사진도 추가 백업 (사용자 ID 포함)
        const photoData = {
          id: response.data.photoId,
          userId: currentUser, // 사용자 ID 추가 
          sessionId: sessionId,
          position: position,
          thumbnail_data: thumbnailData,
          image_data: imageData,
          created_at: new Date().toISOString(),
          color: currentColor,
          timestamp: Date.now() // 검색 최적화용
        };
        await sessionDB.savePhoto(photoData);
        
        console.log(`💾 [보호시스템] IndexedDB 자동 백업 완료 - 사진 ${position}, 총 ${photoCount}장 (사용자: ${currentUser})`);
      } catch (e) {
        console.warn('⚠️ IndexedDB 백업 실패 (Safari 보호 기능 제한):', e.message);
        // 백업 실패해도 메인 기능은 계속 작동
      }
    }
    
    hideLoading();
    
    // URL 업데이트 (사진 개수 반영)
    navigateToProgress(currentColor, photoCount);
    
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
    
    // 완성 대기 화면에서는 토스트 제거 (조용한 저장)
    
  } catch (error) {
    console.error('사진 저장 오류:', error);
    hideLoading();
    
    // 더 자세한 오류 메시지 처리
    let errorMessage = 'Failed to save photo';
    
    if (error.response) {
      // 서버에서 응답한 오류
      const status = error.response.status;
      const data = error.response.data;
      
      console.error('Server error details:', { status, data });
      
      if (status === 413) {
        errorMessage = 'Image too large. Please try again.';
      } else if (status === 507) {
        errorMessage = 'Storage limit exceeded. Please contact support.';
      } else if (data && data.error) {
        errorMessage = data.error;
      } else {
        errorMessage = `Server error (${status})`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showError(errorMessage);
  }
}

// 사진 삭제 (순차적 재정렬)
async function deletePhoto(photoId, position) {
  try {
    // 1. 로컬 세션 데이터에서 먼저 삭제 (즉시 반영)
    updateLocalSessionData(photoId);
    
    // 2. DOM 업데이트 (사용자에게 즉시 반영)
    updateUIAfterDelete(position);
    
    showLoading('Deleting...');
    
    // 3. 서버에서 삭제
    await axios.delete(`/api/photo/${photoId}`);
    
    hideLoading();
    closePhotoDetail();
    
  } catch (error) {
    console.error('Photo delete error:', error);
    hideLoading();
    
    // 4. 실패 시에만 서버 재동기화로 복구
    console.warn('Delete failed. Please try again.');
    try {
      await syncWithServer();
      showError('Delete failed. Please try again.');
    } catch (syncError) {
      showError('Delete failed. Please refresh the app.');
    }
  }
}

// 로컬 세션 데이터 업데이트
function updateLocalSessionData(photoId) {
  if (currentSession && currentSession.photos) {
    // 세션에서 해당 사진 제거
    currentSession.photos = currentSession.photos.filter(photo => photo.id !== photoId);
    
    // 위치 재정렬 (1, 2, 3... 순서로)
    currentSession.photos.forEach((photo, index) => {
      photo.position = index + 1;
    });
    
    // localStorage 캐시 업데이트
    localStorage.setItem('colorhunt_current_session', JSON.stringify(currentSession));
    
    // 전역 photoCount 업데이트
    photoCount = currentSession.photos.length;
  }
}

// UI 업데이트 (DOM 조작)
function updateUIAfterDelete(deletedPosition) {
  // 모든 사진 데이터를 배열로 수집 (삭제된 위치 제외)
  const photos = [];
  for (let i = 1; i <= 15; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot && slot.classList.contains('filled') && i !== deletedPosition) {
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
  
  // 앞으로 당겨서 재배치 (1, 2, 3... 순서)
  photos.forEach((photo, index) => {
    const newPosition = index + 1;
    const slot = document.getElementById(`slot-${newPosition}`);
    if (slot) {
      slot.innerHTML = `<img src="${photo.src}" alt="Photo ${newPosition}">`;
      slot.classList.add('filled');
      slot.setAttribute('data-photo-id', photo.id);
    }
  });
  
  // 전역 카운트 업데이트
  photoCount = photos.length;
  
  // URL 업데이트 (삭제 후 사진 개수 반영)
  navigateToProgress(currentColor, photoCount);
}

// 서버와 재동기화 (복구용)
async function syncWithServer() {
  try {
    const response = await axios.get(`/api/session/current/${currentUser}`);
    const { session } = response.data;
    
    if (session && session.status === 'in_progress') {
      // 서버 데이터로 교체
      currentSession = session;
      currentColor = session.color;
      photoCount = session.photos?.length || 0;
      
      // localStorage 업데이트
      localStorage.setItem('colorhunt_current_session', JSON.stringify(session));
      
      // UI 완전 새로고침
      showCollageScreen();
    }
  } catch (error) {
    console.error('Sync with server failed:', error);
    throw error;
  }
}

// 완성 버튼 상태만 업데이트 (진행률 표시 제거됨)
function updateProgress() {
  // 실제 사진 개수 재계산
  const actualCount = recalculatePhotoCount();
  
  // 완성 버튼 업데이트만 수행
  updateCompleteButton(actualCount);
}

// 완성 버튼 상태 업데이트 (안전한 DOM 조작)
function updateCompleteButton(photoCount) {
  // 메인 액션 버튼만 찾기 (secondary-actions는 건드리지 않음)
  const completeButton = document.querySelector('button[onclick="completeCollage()"]');
  const cameraButton = document.querySelector('button[onclick="openCamera()"]');
  
  if (photoCount === 15) {
    // 15장 완료 시: 카메라 버튼을 완성 버튼으로 교체
    if (cameraButton) {
      // 기존 버튼의 속성과 클래스 유지하면서 내용만 변경
      cameraButton.onclick = () => completeCollage();
      cameraButton.innerHTML = `${t('collage.complete_collage')}`;
      // 클래스도 완성 버튼 스타일로 변경
      cameraButton.className = cameraButton.className.replace('photo-btn', 'complete-btn');
    }
  } else {
    // 15장 미만: 완성 버튼을 카메라 버튼으로 교체  
    if (completeButton) {
      // 기존 버튼의 속성과 클래스 유지하면서 내용만 변경
      completeButton.onclick = () => openCamera();
      completeButton.innerHTML = `${t('picture.take_photo')}`;
      // 클래스도 카메라 버튼 스타일로 변경
      completeButton.className = completeButton.className.replace('complete-btn', 'photo-btn');
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

// 테스트용 함수 제거됨 (실서버 배포용)

// 현재 채워진 사진 개수 정확히 계산
function recalculatePhotoCount() {
  let count = 0;
  for (let i = 1; i <= 15; i++) { // 9 → 15로 수정
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
  
  if (actualPhotoCount < 15) { // 9 → 15로 수정
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
    
    // 🎯 세션 상태를 완료로 변경 (세션 충돌 방지)
    if (currentSession) {
      currentSession.status = 'completed';
      currentSession.completed_at = new Date().toISOString();
      
      // localStorage에 완료 상태 반영
      localStorage.setItem('colorhunt_current_session', JSON.stringify(currentSession));
      
      // IndexedDB에도 완료 상태 저장 (Safari 보호)
      if (typeof ColorHuntSessionDB !== 'undefined') {
        try {
          const sessionDB = new ColorHuntSessionDB();
          await sessionDB.saveSession(currentUser, currentSession);
          console.log('💾 세션 완료 상태 IndexedDB 저장 완료');
        } catch (e) {
          console.warn('⚠️ IndexedDB 완료 상태 저장 실패:', e.message);
        }
      }
      
      console.log('✅ 세션 완료 처리:', currentColor, currentSession.status);
    }
    
    // GA 이벤트 추적
    trackEvent('collage_completed', {
      color_name: currentColor,
      session_id: sessionId,
      photo_count: actualPhotoCount
    });
    
    // 완성 화면 표시
    navigateToComplete(currentColor);
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

// 콜라주 이미지 생성 (3x5 = 15장) - 둥근 모서리와 적절한 간격 적용
async function generateCollageImage() {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 파란색 화면과 동일한 설정 (더 넓은 간격, 더 둥근 모서리)
      const cellSize = 280;
      const gap = 16; // 더 넓은 간격 (12px → 16px)
      const radius = 16; // 더 둥근 모서리 (12px → 16px)
      const borderWidth = 3; // 테두리도 조금 더 두껍게
      
      // 여백 설정 (하단 여백 추가)
      const topMargin = 80;
      const sideMargin = 60;
      const bottomTextMargin = 120; // 텍스트 공간
      const bottomMargin = 60; // Color Hunt 아래 추가 여백
      
      // 콜라주 크기 계산
      const collageWidth = 3 * cellSize + 2 * gap;
      const collageHeight = 5 * cellSize + 4 * gap;
      
      // 캔버스 크기 설정 (하단 여백 포함)
      canvas.width = collageWidth + 2 * sideMargin;
      canvas.height = topMargin + collageHeight + bottomTextMargin + bottomMargin;
      
      console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
      
      // 배경색
      const colorInfo = COLORS[currentColor];
      ctx.fillStyle = colorInfo.hex;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let loadedImages = 0;
      const totalImages = photoCount;
      
      console.log(`Loading ${totalImages} images...`);
      
      // 이미지 로드 및 그리기
      for (let i = 1; i <= 15; i++) {
        const slot = document.getElementById(`slot-${i}`);
        const img = slot.querySelector('img');
        
        if (img && img.src) {
          const newImg = new Image();
          newImg.onload = () => {
            try {
              const row = Math.floor((i-1) / 3);
              const col = (i-1) % 3;
              const x = sideMargin + col * (cellSize + gap);
              const y = topMargin + row * (cellSize + gap);
              
              console.log(`Drawing image ${i} at (${x}, ${y})`);
              
              // 둥근 모서리와 테두리로 그리기
              // 1. 외부 테두리 (둥근 모서리)
              ctx.save();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              drawRoundedRect(ctx, x, y, cellSize, cellSize, radius);
              ctx.fill();
              ctx.restore();
              
              // 2. 내부 이미지 영역 (둥근 모서리 클립핑)
              const imgX = x + borderWidth;
              const imgY = y + borderWidth;
              const imgSize = cellSize - 2 * borderWidth;
              const imgRadius = Math.max(0, radius - borderWidth);
              
              ctx.save();
              drawRoundedRect(ctx, imgX, imgY, imgSize, imgSize, imgRadius);
              ctx.clip();
              ctx.drawImage(newImg, imgX, imgY, imgSize, imgSize);
              ctx.restore();
              
              loadedImages++;
              console.log(`Loaded images: ${loadedImages}/${totalImages}`);
              
              if (loadedImages === totalImages) {
                console.log('All images loaded, adding texts...');
                // 텍스트 추가 (하단 여백 고려)
                addCollageTexts(ctx, canvas.width, canvas.height, topMargin + collageHeight, bottomMargin);
                console.log('Resolving canvas data...');
                resolve(canvas.toDataURL('image/jpeg', 0.9));
              }
            } catch (error) {
              console.error('Error drawing image:', error);
              reject(error);
            }
          };
          
          newImg.onerror = (error) => {
            console.error('Error loading image:', error);
            reject(new Error('Failed to load image'));
          };
          
          newImg.src = img.src;
        }
      }
      
      // 이미지가 하나도 없으면 에러
      if (totalImages === 0) {
        reject(new Error('No images to process'));
      }
      
    } catch (error) {
      console.error('Error in generateCollageImage:', error);
      reject(error);
    }
  });
}

// 콜라주에 텍스트 추가 (날짜와 타이틀) - 하단 여백 포함
function addCollageTexts(ctx, canvasWidth, canvasHeight, collageBottom, bottomMargin = 60) {
  // 텍스트 색상 (흰색)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.textAlign = 'center';
  
  // 날짜 텍스트
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  
  // 날짜 폰트 설정 (텍스트 영역의 중앙 위쪽에 배치)
  ctx.font = 'normal 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textAreaHeight = canvasHeight - collageBottom - bottomMargin; // 실제 텍스트 가능 영역
  const textCenterY = collageBottom + textAreaHeight / 2; // 텍스트 영역 중심
  const dateY = textCenterY - 20; // 날짜를 중심에서 위쪽으로
  ctx.fillText(dateStr, canvasWidth / 2, dateY);
  
  // 타이틀 폰트 설정 (날짜 아래에 배치)
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleY = textCenterY + 25; // 타이틀을 중심에서 아래쪽으로
  ctx.fillText('Color Hunt', canvasWidth / 2, titleY);
}

// 헥스 색상을 RGB로 변환
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// RGB를 헥스로 변환
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 완성 화면 (개선된 플로우)
function showCompletedScreen(collageData) {
  // 배경색 유지 (현재 색상)
  const colorInfo = COLORS[currentColor];
  const isLightColor = ['yellow'].includes(currentColor);
  const textColor = isLightColor ? '#2D2D2D' : '#FFFFFF';
  const buttonStyle = isLightColor ? 'dark' : 'light';
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="text-center animate-fade-in p-4" style="color: ${textColor}">
      <!-- 'Color Complete!' 텍스트 제거됨 -->
      
      <div class="mb-6">
        <img src="${collageData}" alt="Completed color" class="w-full max-w-md mx-auto rounded-lg shadow-lg">
      </div>
      

      
      <div class="space-y-4">
        <button onclick="downloadCollage('${collageData}')" class="btn btn-${buttonStyle} w-full">
          <i class="fas fa-download mr-2"></i>
          Download Again
        </button>
        
        <button onclick="showHistoryScreen()" class="btn btn-outline-${buttonStyle} w-full">
          <i class="fas fa-history mr-2"></i>
          ${t('complete.my_colors')}
        </button>
        
        <button onclick="startNewCollage()" class="btn btn-outline-${buttonStyle} w-full">
          <i class="fas fa-plus mr-2"></i>
          ${t('complete.create_new_color')}
        </button>
      </div>
    </div>
  `;
  

  
  // 완성 화면 진입 후 자동 저장 + 토스트 (약간의 딜레이)
  setTimeout(() => {
    autoSaveCollage(collageData);
  }, 500);
}

// 자동 콜라주 저장 (개선된 버전)
function autoSaveCollage(dataUrl) {
  try {
    // 모바일 환경에서 자동 다운로드 실행
    const link = document.createElement('a');
    const filename = `color-hunt-${currentColor}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.download = filename;
    link.href = dataUrl;
    
    // 링크를 DOM에 추가하고 클릭 후 제거 (모바일 호환성)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // GA 이벤트 추적
    trackEvent('collage_auto_saved', {
      color_name: currentColor || 'unknown',
      file_name: filename
    });
    
    // 저장 완료 토스트 표시
    showToast('📸 Collage saved to your album!', 'success', 4000);
    
    return true;
  } catch (error) {
    console.error('Auto save failed:', error);
    showToast('❌ Failed to save image automatically', 'error');
    return false;
  }
}

// 재다운로드 함수 (완성 화면에서 사용)
function downloadCollage(dataUrl) {
  try {
    // 재다운로드 실행
    const link = document.createElement('a');
    const filename = `color-hunt-${currentColor}-${new Date().toISOString().split('T')[0]}.jpg`;
    link.download = filename;
    link.href = dataUrl;
    
    // 링크를 DOM에 추가하고 클릭 후 제거 (모바일 호환성)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // GA 이벤트 추적
    trackEvent('collage_re_downloaded', {
      color_name: currentColor || 'unknown',
      file_name: filename
    });
    
    // 재다운로드 완료 토스트 표시
    showToast('📥 Downloaded to your album!', 'success', 3000);
    
  } catch (error) {
    console.error('Re-download failed:', error);
    showToast('❌ Failed to download image', 'error');
  }
}

// 새 콜라주 시작 (세션 충돌 방지 강화)
async function startNewCollage() {
  try {
    console.log('🆕 새 콜라주 시작 - 이전 세션 완전 정리');
    
    // 1. 현재 세션이 완료되었는지 확인
    if (currentSession && currentSession.status === 'in_progress' && photoCount < 15) {
      console.log('⚠️ 진행 중인 세션이 있습니다. 정말로 새로 시작하시겠습니까?');
      if (!confirm('현재 진행 중인 세션이 있습니다. 새로 시작하면 기존 사진들이 사라집니다. 계속하시겠습니까?')) {
        return; // 사용자가 취소하면 중단
      }
    }
    
    // 2. 메모리 변수 초기화
    currentSession = null;
    currentColor = null;
    photoCount = 0;
    gameMode = 'unlimited'; // 15장 모드로 고정
    
    // 3. localStorage 완전 정리
    localStorage.removeItem('colorhunt_current_session');
    localStorage.removeItem('colorhunt_session_backup');
    console.log('🗑️ localStorage 세션 데이터 정리 완료');
    
    // 4. IndexedDB 진행 중 세션 정리 (SafarI 보호)
    if (typeof ColorHuntSessionDB !== 'undefined') {
      try {
        const sessionDB = new ColorHuntSessionDB();
        await sessionDB.clearCompletedSession(currentUser);
        console.log('🗑️ IndexedDB 완료된 세션 정리 완료');
      } catch (e) {
        console.warn('⚠️ IndexedDB 정리 실패 (무시):', e.message);
      }
    }
    
    // 5. 새 색상 선택 화면으로 이동
    showColorSelectionScreen();
    
  } catch (error) {
    console.error('❌ 새 콜라주 시작 중 오류:', error);
    // 오류가 발생해도 기본 동작은 수행
    currentSession = null;
    currentColor = null;
    photoCount = 0;
    showColorSelectionScreen();
  }
}

// 세션 리셋
async function resetSession() {
  if (!confirm(t('management.confirm_reset'))) {
    return;
  }
  
  currentSession = null;
  currentColor = null;
  photoCount = 0;
  navigateToMain();
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
function startColorHuntDirectly() {
  // 컬러 선택 화면으로 이동
  navigateToMain();
  showColorSelectionScreen();
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
      'main.start_hunt': 'Start Hunt',
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
      'color.pink': 'Pink',
      'color.tan': 'Tan', 
      'color.beige': 'Beige',
      'color.matcha': 'Matcha',
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
      'alert.take_all_photos': 'Fill all slots to complete your collage'
    },
    ko: {
      'main.whats_today_color': '함께 컬러헌트해요!',
      'main.discover_color': '1. 오늘의 색깔을 확인하세요\n2. 하루 종일 색깔을 찾아보세요\n3. 공유해보세요',
      'main.start': '시작하기',
      'main.start_hunt': '헌트 시작',
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
      'color.pink': '분홍',
      'color.tan': '황갈색',
      'color.beige': '베이지',
      'color.matcha': '말차',
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
      'alert.take_all_photos': '모든 슬롯을 채워서 콜라주를 완성하세요'
    }
  };
  
  console.log('📚 기본 번역 데이터 로드됨 (fallback)');
}

// 유틸리티 함수들

// 로딩 표시
function showLoading(message = 'Loading...') {
  const existingLoader = document.getElementById('loading-overlay');
  if (existingLoader) return;
  
  const loader = document.createElement('div');
  loader.id = 'loading-overlay';
  loader.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  loader.innerHTML = `
    <div class="bg-white rounded-lg p-6 text-center shadow-xl">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div class="text-gray-700">${message}</div>
    </div>
  `;
  document.body.appendChild(loader);
}

// 로딩 숨기기
function hideLoading() {
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.remove();
  }
}

// 오류 표시
function showError(message) {
  showToast(`❌ ${message}`, 'error');
}

// 토스트 메시지
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
  
  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  toast.className += ` ${bgColor} text-white`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // 애니메이션으로 표시
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  // 자동 제거
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// GA 트래킹 함수 (옵셔널)
function trackEvent(eventName, params = {}) {
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    }
  } catch (error) {
    console.log('GA tracking skipped:', eventName);
  }
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
  // i18nData가 비어있으면 fallback 강제 로드
  if (!i18nData.en || Object.keys(i18nData.en).length === 0) {
    loadFallbackTranslations();
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

// ============ GOOGLE OAUTH & AUTHENTICATION SYSTEM ============

const GOOGLE_CLIENT_ID = '153490578452-e9745q71jcp1p69pa8vast1dh4aabg6f.apps.googleusercontent.com';

// Google OAuth 초기화
function initializeGoogleAuth() {
  return new Promise((resolve, reject) => {
    // Google Identity Services 라이브러리가 이미 로드되어 있는지 확인
    if (window.google && window.google.accounts) {
      console.log('✅ Google OAuth already loaded');
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      resolve(true);
      return;
    }

    console.log('🔄 Loading Google OAuth library...');
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      try {
        console.log('✅ Google OAuth library loaded successfully');
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        resolve(true);
      } catch (error) {
        console.error('❌ Google OAuth initialization failed:', error);
        reject(error);
      }
    };
    script.onerror = () => {
      const error = new Error('Failed to load Google OAuth library');
      console.error('❌ Google OAuth library loading failed:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Google 로그인 버튼 클릭
async function signInWithGoogle() {
  try {
    showLoading('Loading Google sign-in...');
    
    // Google OAuth 라이브러리 초기화 대기
    await initializeGoogleAuth();
    
    hideLoading();
    
    // Google One Tap 방식 시도
    google.accounts.id.prompt((notification) => {
      console.log('Google One Tap notification:', notification);
      
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log('One Tap not available, trying OAuth2 flow...');
        
        // One Tap이 표시되지 않으면 OAuth2 팝업 사용
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid profile email',
            callback: async (response) => {
              console.log('OAuth2 response:', response);
              if (response.access_token) {
                await handleGoogleTokenResponse(response.access_token);
              } else if (response.error) {
                console.error('OAuth2 error:', response.error);
                showError('Google sign-in was cancelled or failed.');
              }
            },
            error_callback: (error) => {
              console.error('OAuth2 error callback:', error);
              showError('Google sign-in failed. Please try again.');
            }
          });
          
          tokenClient.requestAccessToken();
        } catch (oauth2Error) {
          console.error('OAuth2 initialization failed:', oauth2Error);
          showError('Google sign-in is not available. Please try guest mode.');
        }
      }
    });
  } catch (error) {
    hideLoading();
    console.error('Google 로그인 초기화 실패:', error);
    showError('Google sign-in is not available. Please try guest mode.');
  }
}

// Google 인증 응답 처리
async function handleCredentialResponse(response) {
  try {
    showLoading('Signing in with Google...');
    
    // JWT 토큰을 백엔드로 전송하여 검증
    const backendResponse = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credential: response.credential
      })
    });

    if (backendResponse.ok) {
      const result = await backendResponse.json();
      
      // 로그인 성공
      localStorage.setItem('colorhunt_auth_token', result.token);
      currentUser = result.user;
      
      hideLoading();
      showToast('Welcome back, ' + result.user.name + '!', 'success');
      
      // 메인 화면으로 이동
      setTimeout(() => {
        const routeResult = initRouter();
        handleRouteResult(routeResult);
      }, 1000);
      
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    hideLoading();
    console.error('Google 로그인 실패:', error);
    showError('Google sign-in failed. Please try again.');
  }
}

// Google 토큰 응답 처리 (OAuth2 방식)
async function handleGoogleTokenResponse(accessToken) {
  try {
    showLoading('Getting your profile...');
    
    // Google API로 사용자 정보 가져오기
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      
      // 백엔드에 사용자 정보 전송
      const backendResponse = await fetch('/api/auth/google-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: profile,
          accessToken: accessToken
        })
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        
        // 로그인 성공
        localStorage.setItem('colorhunt_auth_token', result.token);
        currentUser = result.user;
        
        hideLoading();
        showToast('Welcome, ' + result.user.name + '!', 'success');
        
        // 메인 화면으로 이동
        setTimeout(() => {
          const routeResult = initRouter();
          handleRouteResult(routeResult);
        }, 1000);
      } else {
        throw new Error('Profile authentication failed');
      }
    } else {
      throw new Error('Failed to get Google profile');
    }
  } catch (error) {
    hideLoading();
    console.error('Google 프로필 처리 실패:', error);
    showError('Failed to get your Google profile. Please try again.');
  }
}

// 게스트 모드로 계속하기
async function continueAsGuest() {
  try {
    showLoading('Setting up guest session...');
    
    // 게스트 사용자 생성
    const guestResponse = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: getUserId() // 기존의 사용자 ID 사용
      })
    });

    if (guestResponse.ok) {
      const result = await guestResponse.json();
      
      // 게스트 토큰 저장
      localStorage.setItem('colorhunt_auth_token', result.token);
      currentUser = result.user;
      
      hideLoading();
      showToast('Welcome to Color Hunt!', 'success');
      
      // 메인 화면으로 이동
      setTimeout(() => {
        const routeResult = initRouter();
        handleRouteResult(routeResult);
      }, 1000);
    } else {
      throw new Error('Guest authentication failed');
    }
  } catch (error) {
    hideLoading();
    console.error('게스트 로그인 실패:', error);
    showError('Failed to create guest session. Please try again.');
  }
}

// 로그아웃
async function logout() {
  try {
    // 로컬 저장소 정리
    localStorage.removeItem('colorhunt_auth_token');
    localStorage.removeItem('colorhunt_user_id');
    
    // 세션 정리
    currentUser = null;
    currentSession = null;
    currentColor = null;
    photoCount = 0;
    
    // Google 로그아웃 (Google 사용자인 경우)
    if (window.google && currentUser?.type === 'google') {
      google.accounts.id.disableAutoSelect();
    }
    
    showToast('Logged out successfully', 'success');
    
    // 로그인 화면으로 이동
    setTimeout(() => {
      showAuthScreen();
    }, 1000);
  } catch (error) {
    console.error('로그아웃 실패:', error);
    showError('Logout failed. Please try again.');
  }
}

// 인증 상태 확인 유틸리티
function isAuthenticated() {
  return currentUser !== null && localStorage.getItem('colorhunt_auth_token') !== null;
}

function isGoogleUser() {
  return currentUser?.type === 'google';
}

function isGuestUser() {
  return currentUser?.type === 'guest';
}