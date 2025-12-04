import { getOrCreateActiveSession, SessionInfo } from './session';
import { savePhoto, PhotoRecord } from './storage';
import { trackPhotoTaken } from './analytics';

export type CameraConfig = {
  videoElement: HTMLVideoElement;
  canvasElement: HTMLCanvasElement;
  maxWidth?: number;
  maxHeight?: number;
};

let currentStream: MediaStream | null = null;

export async function initCamera(config: CameraConfig): Promise<void> {
  const { videoElement } = config;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API not supported');
  }

  currentStream?.getTracks().forEach(track => track.stop());

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  currentStream = stream;
  videoElement.srcObject = stream;
  await videoElement.play();
}

export async function capturePhotoBlob(
  config: CameraConfig,
): Promise<Blob> {
  const { videoElement, canvasElement, maxWidth = 1080, maxHeight = 1080 } =
    config;

  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;

  if (!videoWidth || !videoHeight) {
    throw new Error('Video not ready');
  }

  let targetWidth = videoWidth;
  let targetHeight = videoHeight;

  const widthRatio = maxWidth / videoWidth;
  const heightRatio = maxHeight / videoHeight;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  targetWidth = Math.round(videoWidth * ratio);
  targetHeight = Math.round(videoHeight * ratio);

  canvasElement.width = targetWidth;
  canvasElement.height = targetHeight;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvasElement.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9,
    );
  });
}

export function startColorSession(colorCode: string): SessionInfo {
  const session = getOrCreateActiveSession(colorCode);
  return session;
}

export async function takeAndSavePhoto(
  session: SessionInfo,
  stepIndex: number,
  config: CameraConfig,
): Promise<PhotoRecord> {
  const blob = await capturePhotoBlob(config);

  const record: PhotoRecord = {
    sessionId: session.sessionId,
    colorCode: session.colorCode,
    stepIndex,
    blob,
    createdAt: Date.now(),
  };

  await savePhoto(record);
  trackPhotoTaken(stepIndex);

  return record;
}

export function stopCamera(): void {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
}
