import { db, getCurrentSession, saveSession } from './db.js';

/**
 * UUID 기반 세션 관리
 * URL 쿼리 파라미터 ?s={sessionId}를 사용
 */

export function initializeSession() {
  console.log('🔧 Initializing UUID-based session...');
  
  // URL에서 세션 ID 확인
  let sid = new URL(location.href).searchParams.get('s');
  
  if (!sid) {
    // 새 세션 생성
    sid = crypto.randomUUID();
    console.log('🆕 New session created:', sid);
    
    // localStorage에 저장
    localStorage.setItem('currentSessionId', sid);
    
    // URL에 반영 (페이지 리로드 없이)
    history.replaceState({}, '', `?s=${sid}`);
  } else {
    console.log('✅ Existing session from URL:', sid);
    localStorage.setItem('currentSessionId', sid);
  }
  
  console.log('sessionId', sid);
  return sid;
}

export async function loadSessionState(sessionId) {
  console.log('📂 Loading session state for:', sessionId);
  
  // IndexedDB에서 세션 로드
  const session = await getCurrentSession(sessionId);
  
  if (session) {
    console.log('✅ Session loaded from IndexedDB:', session);
    return session;
  }
  
  // 새 세션 생성
  console.log('🆕 Creating new session in IndexedDB');
  const newSession = {
    id: sessionId,
    status: 'in_progress',
    color: null,
    updatedAt: Date.now()
  };
  
  await saveSession(newSession);
  return newSession;
}

export async function markSessionComplete(sessionId) {
  console.log('✅ Marking session as complete:', sessionId);
  
  const session = await getCurrentSession(sessionId);
  if (session) {
    session.status = 'done';
    session.updatedAt = Date.now();
    await saveSession(session);
  }
}

// 자동 완료 방지: "완성 보기" 버튼 클릭 시에만 완료 처리
export function shouldAutoComplete() {
  return false; // 항상 false - 자동 완료 금지
}
