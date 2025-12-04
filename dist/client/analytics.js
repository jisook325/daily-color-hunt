import { getOrCreateUserId, getActiveSession } from './session.js';

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  const gtag = window.gtag;
  if (!gtag) return;

  const userId = params.user_id || getOrCreateUserId();
  const activeSession = getActiveSession();

  const mergedParams = {
    ...params,
    user_id: userId,
  };

  if (activeSession) {
    mergedParams.session_id =
      params.session_id || activeSession.sessionId || undefined;
    mergedParams.color_code =
      params.color_code || activeSession.colorCode || undefined;
  }

  gtag('event', eventName, mergedParams);
}

export function trackColorSelected(colorCode) {
  trackEvent('color_selected', { color_code: colorCode });
}

export function trackPhotoTaken(stepIndex) {
  trackEvent('photo_taken', { step_index: stepIndex });
}

export function trackCollageGenerated(photoCount) {
  trackEvent('collage_generated', { photo_count: photoCount });
}

export function trackCollageDownloaded() {
  trackEvent('collage_downloaded', {});
}
