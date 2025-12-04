import { getOrCreateUserId, getActiveSession } from './session';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export type EventParams = {
  user_id?: string;
  session_id?: string;
  color_code?: string;
  [key: string]: any;
};

export function trackEvent(eventName: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = window.gtag;
  if (!gtag) return;

  const userId = params.user_id || getOrCreateUserId();
  const activeSession = getActiveSession();

  const mergedParams: EventParams = {
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

export function trackColorSelected(colorCode: string) {
  trackEvent('color_selected', { color_code: colorCode });
}

export function trackPhotoTaken(stepIndex: number) {
  trackEvent('photo_taken', { step_index: stepIndex });
}

export function trackCollageGenerated(photoCount: number) {
  trackEvent('collage_generated', { photo_count: photoCount });
}

export function trackCollageDownloaded() {
  trackEvent('collage_downloaded', {});
}
