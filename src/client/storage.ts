export const DCH_DB_NAME = 'dch-photo-db';
export const DCH_DB_VERSION = 1;
export const DCH_PHOTOS_STORE = 'photos';

export type PhotoRecord = {
  id?: number;
  sessionId: string;
  colorCode: string;
  stepIndex: number;
  blob: Blob;
  createdAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DCH_DB_NAME, DCH_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DCH_PHOTOS_STORE)) {
        const store = db.createObjectStore(DCH_PHOTOS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by_sessionId', 'sessionId', { unique: false });
        store.createIndex(
          'by_sessionId_and_stepIndex',
          ['sessionId', 'stepIndex'],
          { unique: false },
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

async function getStore(
  mode: IDBTransactionMode = 'readonly',
): Promise<IDBObjectStore> {
  const db = await initDB();
  const tx = db.transaction(DCH_PHOTOS_STORE, mode);
  return tx.objectStore(DCH_PHOTOS_STORE);
}

export async function savePhoto(record: PhotoRecord): Promise<void> {
  const store = await getStore('readwrite');
  const data: PhotoRecord = {
    ...record,
    createdAt: record.createdAt ?? Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const req = store.add(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadPhotosBySession(
  sessionId: string,
): Promise<PhotoRecord[]> {
  const store = await getStore('readonly');
  const index = store.index('by_sessionId');
  const range = IDBKeyRange.only(sessionId);

  return new Promise<PhotoRecord[]>((resolve, reject) => {
    const result: PhotoRecord[] = [];
    const req = index.openCursor(range);

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        result.sort((a, b) => a.stepIndex - b.stepIndex);
        resolve(result);
        return;
      }
      result.push(cursor.value as PhotoRecord);
      cursor.continue();
    };

    req.onerror = () => reject(req.error);
  });
}

export async function deletePhotosBySession(sessionId: string): Promise<void> {
  const store = await getStore('readwrite');
  const index = store.index('by_sessionId');
  const range = IDBKeyRange.only(sessionId);

  await new Promise<void>((resolve, reject) => {
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}
