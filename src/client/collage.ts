import {
  loadPhotosBySession,
  deletePhotosBySession,
  PhotoRecord,
} from './storage';
import { SessionInfo, clearActiveSession } from './session';
import {
  trackCollageGenerated,
  trackCollageDownloaded,
} from './analytics';

export type CollageConfig = {
  canvasElement: HTMLCanvasElement;
  columns: number;
  rows: number;
  padding?: number;
  backgroundColor?: string;
};

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function generateCollageBlob(
  session: SessionInfo,
  config: CollageConfig,
  inMemoryPhotos: PhotoRecord[],
): Promise<Blob> {
  let photos = inMemoryPhotos;
  if (!photos || photos.length === 0) {
    photos = await loadPhotosBySession(session.sessionId);
  }

  if (!photos || photos.length === 0) {
    throw new Error('No photos available for collage');
  }

  const { canvasElement, columns, rows, padding = 10, backgroundColor = '#ffffff' } =
    config;

  const totalSlots = columns * rows;
  const usedPhotos = photos.slice(0, totalSlots);

  const cellSize = 480;
  const width = columns * cellSize + (columns + 1) * padding;
  const height = rows * cellSize + (rows + 1) * padding;

  canvasElement.width = width;
  canvasElement.height = height;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < usedPhotos.length; i++) {
    const photo = usedPhotos[i];
    const img = await blobToImage(photo.blob);

    const col = i % columns;
    const row = Math.floor(i / columns);

    const x = padding + col * (cellSize + padding);
    const y = padding + row * (cellSize + padding);

    const ratio = Math.min(
      cellSize / img.width,
      cellSize / img.height,
    );
    const drawWidth = img.width * ratio;
    const drawHeight = img.height * ratio;
    const offsetX = x + (cellSize - drawWidth) / 2;
    const offsetY = y + (cellSize - drawHeight) / 2;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  trackCollageGenerated(usedPhotos.length);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvasElement.toBlob(
      outBlob => {
        if (!outBlob) {
          reject(new Error('Failed to create collage blob'));
          return;
        }
        resolve(outBlob);
      },
      'image/jpeg',
      0.9,
    );
  });

  return blob;
}

export async function downloadAndFinalizeCollage(
  session: SessionInfo,
  collageBlob: Blob,
  fileName: string = 'daily-color-hunt-collage.jpg',
): Promise<void> {
  const url = URL.createObjectURL(collageBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  trackCollageDownloaded();

  await deletePhotosBySession(session.sessionId);
  clearActiveSession();
}
