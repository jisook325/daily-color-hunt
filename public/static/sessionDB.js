// 🗄️ IndexedDB Session Management Utility
// Safari 세션 보호를 위한 강력한 로컬 백업 시스템

class ColorHuntSessionDB {
  constructor() {
    this.dbName = 'ColorHuntDB';
    this.version = 1;
    this.db = null;
  }

  // 데이터베이스 초기화
  async init() {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onerror = () => {
          console.error('❌ IndexedDB 초기화 실패:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB 초기화 완료');
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // sessions 테이블 생성
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'userId' });
            sessionStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
            console.log('📦 Sessions 스토어 생성 완료');
          }
          
          // photos 테이블 생성 (추가 백업용)
          if (!db.objectStoreNames.contains('photos')) {
            const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
            photoStore.createIndex('sessionId', 'sessionId', { unique: false });
            photoStore.createIndex('userId', 'userId', { unique: false });
            photoStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('📷 Photos 스토어 생성 완료');
          }
          
          // users 테이블 생성 (사용자 ID 보호용)
          if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
            console.log('👤 Users 스토어 생성 완료');
          }
        };
      });
    } catch (error) {
      console.error('❌ IndexedDB 초기화 중 오류:', error);
      return false;
    }
  }

  // 세션 저장 (사진 촬영마다 호출)
  async saveSession(userId, sessionData) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      const sessionRecord = {
        userId: userId,
        session: sessionData,
        lastUpdated: new Date().toISOString(),
        timestamp: Date.now(),
        photoCount: sessionData.photos?.length || 0
      };
      
      await store.put(sessionRecord);
      console.log(`💾 세션 저장 완료 (사진: ${sessionRecord.photoCount}장)`);
      return true;
      
    } catch (error) {
      console.error('❌ 세션 저장 실패:', error);
      return false;
    }
  }

  // 세션 복구 (Safari 복구 시 사용)
  async getSession(userId) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      
      const request = store.get(userId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.session) {
            console.log(`🔄 세션 복구 성공 (사진: ${result.photoCount}장)`);
            resolve(result.session);
          } else {
            console.log('📭 저장된 세션 없음');
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('❌ 세션 복구 실패:', request.error);
          resolve(null);
        };
      });
      
    } catch (error) {
      console.error('❌ 세션 복구 중 오류:', error);
      return null;
    }
  }

  // 사진 데이터 추가 백업
  async savePhoto(photoData) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');
      
      const photoRecord = {
        id: photoData.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        sessionId: photoData.sessionId,
        position: photoData.position,
        imageData: photoData.imageData,
        thumbnailData: photoData.thumbnailData,
        timestamp: Date.now(),
        saved_at: new Date().toISOString()
      };
      
      await store.put(photoRecord);
      console.log(`📷 사진 백업 완료 (위치: ${photoRecord.position})`);
      return true;
      
    } catch (error) {
      console.error('❌ 사진 백업 실패:', error);
      return false;
    }
  }

  // 세션의 모든 사진 데이터 복구
  async getPhotosForSession(sessionId) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const index = store.index('sessionId');
      
      const request = index.getAll(sessionId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const photos = request.result || [];
          console.log(`📷 사진 데이터 복구: ${photos.length}장`);
          resolve(photos);
        };
        
        request.onerror = () => {
          console.error('❌ 사진 데이터 복구 실패:', request.error);
          resolve([]);
        };
      });
      
    } catch (error) {
      console.error('❌ 사진 데이터 복구 중 오류:', error);
      return [];
    }
  }

  // 사용자 ID 저장 (Safari 보호)
  async saveUserId(userId) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      
      const userData = {
        id: 'current_user',
        userId: userId,
        timestamp: Date.now(),
        lastUpdated: Date.now()
      };
      
      await store.put(userData);
      console.log('💾 사용자 ID IndexedDB 저장 완료:', userId);
      return true;
      
    } catch (error) {
      console.error('❌ 사용자 ID 저장 실패:', error);
      return false;
    }
  }

  // 사용자 ID 복구 (Safari 보호)
  async getUserId() {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get('current_user');
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const userData = request.result;
          if (userData && userData.userId) {
            console.log('🔄 IndexedDB에서 사용자 ID 복구:', userData.userId);
            resolve(userData.userId);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('❌ 사용자 ID 복구 실패:', request.error);
          resolve(null);
        };
      });
      
    } catch (error) {
      console.error('❌ 사용자 ID 복구 중 오류:', error);
      return null;
    }
  }

  // 사용자의 모든 사진 가져오기 (세션 복구용)
  async getAllPhotos(userId) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');
      const index = store.index('userId');
      
      const request = index.getAll(userId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const photos = request.result || [];
          // 최신 사진들만 반환 (24시간 이내)
          const recent = photos.filter(photo => {
            const photoAge = Date.now() - photo.timestamp;
            return photoAge < 24 * 60 * 60 * 1000; // 24시간
          });
          console.log(`📷 모든 사진 복구: ${recent.length}장 (총 ${photos.length}장 중)`);
          resolve(recent);
        };
        
        request.onerror = () => {
          console.error('❌ 모든 사진 복구 실패:', request.error);
          resolve([]);
        };
      });
      
    } catch (error) {
      console.error('❌ 모든 사진 복구 중 오류:', error);
      return [];
    }
  }

  // 완성된 세션 정리
  async clearCompletedSession(userId) {
    try {
      if (!this.db) await this.init();
      
      const transaction = this.db.transaction(['sessions', 'photos'], 'readwrite');
      const sessionStore = transaction.objectStore('sessions');
      const photoStore = transaction.objectStore('photos');
      
      // 세션 데이터 삭제
      await sessionStore.delete(userId);
      
      // 관련 사진 데이터도 정리 (옵션)
      // 참고: 사진은 완성 후에도 유지할 수 있음
      
      console.log('🧹 완성된 세션 정리 완료');
      return true;
      
    } catch (error) {
      console.error('❌ 세션 정리 실패:', error);
      return false;
    }
  }

  // 오래된 데이터 정리 (1주일 이상)
  async cleanupOldData() {
    try {
      if (!this.db) await this.init();
      
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const transaction = this.db.transaction(['sessions', 'photos'], 'readwrite');
      const sessionStore = transaction.objectStore('sessions');
      const photoStore = transaction.objectStore('photos');
      
      // 오래된 세션 정리
      const sessionIndex = sessionStore.index('lastUpdated');
      const sessionRequest = sessionIndex.openCursor();
      
      let cleanedSessions = 0;
      let cleanedPhotos = 0;
      
      sessionRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < weekAgo) {
            cursor.delete();
            cleanedSessions++;
          }
          cursor.continue();
        }
      };
      
      // 오래된 사진 정리
      const photoIndex = photoStore.index('timestamp');
      const photoRequest = photoIndex.openCursor();
      
      photoRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < weekAgo) {
            cursor.delete();
            cleanedPhotos++;
          }
          cursor.continue();
        }
      };
      
      setTimeout(() => {
        console.log(`🧹 데이터 정리 완료: 세션 ${cleanedSessions}개, 사진 ${cleanedPhotos}장`);
      }, 1000);
      
      return true;
      
    } catch (error) {
      console.error('❌ 데이터 정리 실패:', error);
      return false;
    }
  }

  // IndexedDB 지원 여부 확인
  static isSupported() {
    return 'indexedDB' in window && indexedDB !== null;
  }

  // 저장 용량 체크
  async getStorageInfo() {
    try {
      if ('navigator' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          available: estimate.quota,
          used: estimate.usage,
          percentage: Math.round((estimate.usage / estimate.quota) * 100)
        };
      }
      return null;
    } catch (error) {
      console.error('❌ 저장 용량 확인 실패:', error);
      return null;
    }
  }
}

// 전역 인스턴스 생성
window.sessionDB = new ColorHuntSessionDB();

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  if (ColorHuntSessionDB.isSupported()) {
    await window.sessionDB.init();
    
    // 앱 시작 시 오래된 데이터 정리
    setTimeout(() => {
      window.sessionDB.cleanupOldData();
    }, 5000);
    
    console.log('🎯 IndexedDB 세션 보호 시스템 활성화');
  } else {
    console.warn('⚠️ 이 브라우저는 IndexedDB를 지원하지 않습니다.');
  }
});