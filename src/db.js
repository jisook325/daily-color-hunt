import Dexie from 'dexie';

export const db = new Dexie('daily-color-hunt');

db.version(1).stores({
  photos: 'id,sessionId,createdAt,position',
  sessions: 'id,status,updatedAt,color'
});

// Helper functions
export async function savePhotoToIndexedDB(photoData) {
  const { id, sessionId, blob, position, createdAt } = photoData;
  await db.photos.put({
    id,
    sessionId,
    blob,
    position,
    createdAt: createdAt || Date.now()
  });
  console.log('📸 Photo saved to IndexedDB:', id, 'position:', position);
  console.log('📊 IndexedDB photo count:', await db.photos.count());
}

export async function getSessionPhotos(sessionId) {
  console.log('🔍 Loading photos for sessionId:', sessionId);
  const photos = await db.photos.where('sessionId').equals(sessionId).sortBy('position');
  console.log('📊 IndexedDB photo count:', photos.length);
  return photos;
}

export async function getCurrentSession(sessionId) {
  const session = await db.sessions.get(sessionId);
  if (session) {
    console.log('✅ Session found in IndexedDB:', sessionId);
  } else {
    console.log('❌ Session not found in IndexedDB:', sessionId);
  }
  return session;
}

export async function saveSession(sessionData) {
  const { id, status, color, updatedAt } = sessionData;
  await db.sessions.put({
    id,
    status: status || 'in_progress',
    color,
    updatedAt: updatedAt || Date.now()
  });
  console.log('💾 Session saved to IndexedDB:', id, 'status:', status || 'in_progress');
}

// Flush current in-memory data to IndexedDB (for visibilitychange)
export async function flushToIndexedDB(currentSessionData, photosArray) {
  if (!currentSessionData?.id) return;
  
  console.log('🔄 Flushing to IndexedDB...');
  
  // Save session
  await saveSession(currentSessionData);
  
  // Save all photos
  for (const photo of photosArray) {
    if (photo.blob) {
      await savePhotoToIndexedDB(photo);
    }
  }
  
  console.log('✅ Flush complete');
}
