export const DCH_USER_ID_KEY = 'dch_user_id';
export const DCH_ACTIVE_SESSION_KEY = 'dch_active_session';

function safeParseJSON(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateUserId() {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DCH_USER_ID_KEY);
  if (existing) return existing;

  const newId = generateUUID();
  window.localStorage.setItem(DCH_USER_ID_KEY, newId);
  return newId;
}

export function getUserId() {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DCH_USER_ID_KEY);
  return existing || getOrCreateUserId();
}

export function getActiveSession() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DCH_ACTIVE_SESSION_KEY);
  return safeParseJSON(raw);
}

export function getOrCreateActiveSession(colorCode) {
  if (typeof window === 'undefined') {
    return {
      sessionId: generateUUID(),
      colorCode,
    };
  }

  const existing = getActiveSession();
  if (existing && existing.colorCode === colorCode) {
    return existing;
  }

  const newSession = {
    sessionId: `dch_session_${generateUUID()}`,
    colorCode,
  };
  window.localStorage.setItem(
    DCH_ACTIVE_SESSION_KEY,
    JSON.stringify(newSession),
  );
  return newSession;
}

export function clearActiveSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DCH_ACTIVE_SESSION_KEY);
}
