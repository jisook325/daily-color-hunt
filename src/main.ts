import './style.css';
import { initDB, loadPhotosBySession, PhotoRecord } from './client/storage';
import {
  getActiveSession,
  clearActiveSession,
  SessionInfo,
  getUserId,
} from './client/session';
import {
  trackColorSelected,
  trackCollageDownloaded,
} from './client/analytics';
import {
  CameraConfig,
  initCamera,
  startColorSession,
  stopCamera,
  takeAndSavePhoto,
} from './client/camera';
import {
  CollageConfig,
  generateCollageBlob,
  downloadAndFinalizeCollage,
} from './client/collage';

const MAX_PHOTOS = 15;
const GRID_COLUMNS = 3;
const GRID_ROWS = 5;

let activeSession: SessionInfo | null = null;
let photos: PhotoRecord[] = [];
let collageBlob: Blob | null = null;
let cameraConfig: CameraConfig | null = null;

function qs<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) {
    throw new Error(`Element not found: ${selector}`);
  }
  return el as T;
}

function renderColor(colorCode: string | null) {
  const chip = qs<HTMLDivElement>('#color-chip');
  const codeEl = qs<HTMLDivElement>('#color-code');
  if (!colorCode) {
    chip.style.backgroundColor = 'transparent';
    codeEl.textContent = '-';
    return;
  }
  chip.style.backgroundColor = colorCode;
  codeEl.textContent = colorCode;
}

function renderPhotos() {
  const grid = qs<HTMLDivElement>('#photo-grid');
  grid.innerHTML = '';

  const countEl = qs<HTMLSpanElement>('#photo-count');
  countEl.textContent = String(photos.length);

  for (let i = 0; i < MAX_PHOTOS; i++) {
    const slot = document.createElement('div');
    slot.className = 'dch-photo-slot';

    const record = photos.find(p => p.stepIndex === i);
    if (record) {
      slot.classList.add('filled');

      const url = URL.createObjectURL(record.blob);
      const img = document.createElement('img');
      img.src = url;
      img.className = 'dch-photo-thumb';
      img.onload = () => {
        URL.revokeObjectURL(url);
      };

      slot.appendChild(img);
    } else {
      const label = document.createElement('span');
      label.textContent = `${i + 1}`;
      label.className = 'dch-slot-label';
      slot.appendChild(label);
    }

    grid.appendChild(slot);
  }
}

async function fetchNewColor(): Promise<string> {
  const userId = getUserId();

  const res = await fetch('/api/color/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch new color');
  }

  const data = await res.json();
  // API 형식은 레포에 맞춰 조정 필요: 여기서는 { colorCode: string } 가정
  const colorCode: string = data.colorCode || data.color || '#FFAA33';
  return colorCode;
}

async function uploadCollageToServer(
  session: SessionInfo,
  blob: Blob,
): Promise<void> {
  try {
    const userId = getUserId();
    const fileName = `dch-collage-${session.sessionId}.jpg`;
    const form = new FormData();
    form.append('file', blob, fileName);
    form.append('sessionId', session.sessionId);
    form.append('colorCode', session.colorCode);
    form.append('userId', userId);

    await fetch('/api/collage/upload', {
      method: 'POST',
      body: form,
    });

    // 필요하다면 /api/collage/complete 호출도 추가 가능
    // await fetch('/api/collage/complete', { ... });
  } catch (e) {
    console.error('Failed to upload collage to server', e);
  }
}

async function handleNewColorClick() {
  const btn = qs<HTMLButtonElement>('#btn-new-color');
  btn.disabled = true;
  try {
    const colorCode = await fetchNewColor();
    activeSession = startColorSession(colorCode);
    photos = [];
    collageBlob = null;
    renderColor(colorCode);
    renderPhotos();
    trackColorSelected(colorCode);
  } catch (e) {
    console.error(e);
    alert('새 컬러를 가져오는 중 오류가 발생했습니다.');
  } finally {
    btn.disabled = false;
  }
}

async function handleStartCamera() {
  const video = qs<HTMLVideoElement>('#camera-video');
  const canvas = qs<HTMLCanvasElement>('#camera-canvas');

  cameraConfig = {
    videoElement: video,
    canvasElement: canvas,
    maxWidth: 1080,
    maxHeight: 1080,
  };

  try {
    await initCamera(cameraConfig);
  } catch (e) {
    console.error(e);
    alert('카메라를 사용할 수 없습니다.');
  }
}

function handleStopCamera() {
  stopCamera();
}

async function handleTakePhoto() {
  if (!activeSession) {
    alert('먼저 컬러를 선택해 주세요.');
    return;
  }
  if (!cameraConfig) {
    alert('먼저 카메라를 시작해 주세요.');
    return;
  }
  if (photos.length >= MAX_PHOTOS) {
    alert('이미 최대 장수를 촬영했습니다.');
    return;
  }

  try {
    const stepIndex = photos.length; // 0부터 순서대로
    const record = await takeAndSavePhoto(
      activeSession,
      stepIndex,
      cameraConfig,
    );
    photos = [...photos, record];
    renderPhotos();
  } catch (e) {
    console.error(e);
    alert('사진 촬영 중 오류가 발생했습니다.');
  }
}

async function handleGenerateCollage() {
  if (!activeSession) {
    alert('먼저 컬러를 선택해 주세요.');
    return;
  }
  const canvas = qs<HTMLCanvasElement>('#collage-canvas');

  const config: CollageConfig = {
    canvasElement: canvas,
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    padding: 10,
    backgroundColor: '#ffffff',
  };

  try {
    collageBlob = await generateCollageBlob(
      activeSession,
      config,
      photos,
    );
    // 콜라주 캔버스는 이미 그려진 상태 (preview)
    await uploadCollageToServer(activeSession, collageBlob);
  } catch (e) {
    console.error(e);
    alert('콜라주 생성 중 오류가 발생했습니다.');
  }
}

async function handleDownloadCollage() {
  if (!activeSession || !collageBlob) {
    alert('먼저 콜라주를 생성해 주세요.');
    return;
  }
  try {
    await downloadAndFinalizeCollage(activeSession, collageBlob);
    trackCollageDownloaded();
    activeSession = null;
    photos = [];
    collageBlob = null;
    renderColor(null);
    renderPhotos();
    clearActiveSession();
  } catch (e) {
    console.error(e);
    alert('콜라주 다운로드 중 오류가 발생했습니다.');
  }
}

function setupEventListeners() {
  qs<HTMLButtonElement>('#btn-new-color').addEventListener(
    'click',
    () => {
      handleNewColorClick();
    },
  );

  qs<HTMLButtonElement>('#btn-start-camera').addEventListener(
    'click',
    () => {
      handleStartCamera();
    },
  );

  qs<HTMLButtonElement>('#btn-stop-camera').addEventListener(
    'click',
    () => {
      handleStopCamera();
    },
  );

  qs<HTMLButtonElement>('#btn-take-photo').addEventListener(
    'click',
    () => {
      handleTakePhoto();
    },
  );

  qs<HTMLButtonElement>('#btn-generate-collage').addEventListener(
    'click',
    () => {
      handleGenerateCollage();
    },
  );

  qs<HTMLButtonElement>('#btn-download-collage').addEventListener(
    'click',
    () => {
      handleDownloadCollage();
    },
  );
}

async function bootstrap() {
  await initDB();

  const existing = getActiveSession();
  if (existing) {
    activeSession = existing;
    try {
      photos = await loadPhotosBySession(existing.sessionId);
    } catch (e) {
      console.error('Failed to load photos from IndexedDB', e);
      photos = [];
    }
    renderColor(existing.colorCode);
  } else {
    renderColor(null);
  }

  renderPhotos();
  setupEventListeners();
}

window.addEventListener('load', () => {
  bootstrap().catch(err => {
    console.error(err);
  });
});
