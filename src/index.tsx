import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

// Color constants definition (Rainbow colors + black + extras, excluding white for visibility)
const COLORS = [
  { name: 'red', hex: '#FF3333', english: 'Red', korean: '빨강' },
  { name: 'orange', hex: '#FFCC99', english: 'Orange', korean: '주황' },
  { name: 'yellow', hex: '#FFF2CC', english: 'Yellow', korean: '노랑' },
  { name: 'green', hex: '#C6E2C7', english: 'Green', korean: '초록' },
  { name: 'blue', hex: '#B3D3FF', english: 'Blue', korean: '파랑' },
  { name: 'lavender', hex: '#C7B3EB', english: 'Lavender', korean: '보라' },
  { name: 'purple', hex: '#E0B3FF', english: 'Violet', korean: '보라' },
  // { name: 'white', hex: '#FEFEFE', english: 'White', korean: '흰색' }, // 제외: 텍스트 가독성 문제
  { name: 'black', hex: '#2D2D2D', english: 'Black', korean: '검정' },
  { name: 'pink', hex: '#ffbde4', english: 'Pink', korean: '분홍' },
  { name: 'tan', hex: '#D2B48C', english: 'Tan', korean: '황갈색' },
  { name: 'beige', hex: '#A67B5B', english: 'French Beige', korean: '베이지' },
  { name: 'matcha', hex: '#82A860', english: 'Matcha', korean: '말차' }
];

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  GA_MEASUREMENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS configuration
app.use('/api/*', cors())

// Static file serving
app.use('/static/*', serveStatic({ root: './public' }))
app.use(renderer)

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getRandomColor(excludeColor?: string): typeof COLORS[0] {
  const availableColors = excludeColor 
    ? COLORS.filter(c => c.name !== excludeColor)
    : COLORS;
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

// ============ AUTHENTICATION & JWT UTILITIES ============

// JWT 헤더와 페이로드 인코딩 (간단한 Base64URL)
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Base64URL을 Base64로 변환
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // 패딩 추가
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

// JWT 생성 (Web Crypto API 사용)
async function createJWT(payload: any): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // 간단한 서명을 위해 해시 사용 (프로덕션에서는 proper secret 사용)
  const signature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data + 'color-hunt-secret-key'));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${encodedSignature}`;
}

// JWT 검증
async function verifyJWT(token: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // 서명 검증
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data + 'color-hunt-secret-key'));
    const expectedEncodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(expectedSignature)));
    
    if (encodedSignature !== expectedEncodedSignature) {
      return null;
    }

    // 페이로드 디코딩
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // 만료 확인
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT 검증 실패:', error);
    return null;
  }
}

// Google JWT 토큰 검증
async function verifyGoogleJWT(credential: string): Promise<any> {
  try {
    // Google의 JWT 검증 (간단화된 버전)
    const parts = credential.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    console.log('Google JWT payload:', {
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      email: payload.email,
      name: payload.name
    });
    
    // Issuer 검증
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      console.error('Invalid issuer:', payload.iss);
      return null;
    }
    
    // Audience 검증
    const expectedClientId = '153490578452-e9745q71jcp1p69pa8vast1dh4aabg6f.apps.googleusercontent.com';
    if (payload.aud !== expectedClientId) {
      console.error('Invalid audience:', payload.aud, 'expected:', expectedClientId);
      return null;
    }
    
    // 만료 시간 검증
    if (Date.now() / 1000 > payload.exp) {
      console.error('Token expired:', payload.exp, 'current:', Date.now() / 1000);
      return null;
    }

    // 필수 필드 확인
    if (!payload.sub || !payload.email) {
      console.error('Missing required fields in JWT');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Google JWT 검증 실패:', error);
    return null;
  }
}

// 사용자 생성 또는 업데이트
async function createOrUpdateUser(env: Bindings, userData: any): Promise<any> {
  const userId = generateId();
  const now = new Date().toISOString();

  if (userData.type === 'google') {
    // Google 사용자 - 기존 사용자 확인
    const existingUser = await env.DB.prepare(`
      SELECT * FROM users WHERE google_id = ? OR email = ?
    `).bind(userData.google_id, userData.email).first();

    if (existingUser) {
      // 기존 사용자 업데이트
      await env.DB.prepare(`
        UPDATE users SET 
          name = ?, picture = ?, last_login_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(userData.name, userData.picture, now, now, existingUser.id).run();

      return { ...existingUser, name: userData.name, picture: userData.picture };
    } else {
      // 새 Google 사용자 생성
      const newUser = {
        id: userId,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        type: 'google',
        google_id: userData.google_id,
        device_id: null,
        created_at: now,
        updated_at: now,
        last_login_at: now
      };

      await env.DB.prepare(`
        INSERT INTO users (id, email, name, picture, type, google_id, created_at, updated_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newUser.id, newUser.email, newUser.name, newUser.picture, 
        newUser.type, newUser.google_id, newUser.created_at, 
        newUser.updated_at, newUser.last_login_at
      ).run();

      return newUser;
    }
  } else {
    // 게스트 사용자
    const guestUser = {
      id: userId,
      email: null,
      name: userData.name || 'Guest User',
      picture: null,
      type: 'guest',
      google_id: null,
      device_id: userData.deviceId,
      created_at: now,
      updated_at: now,
      last_login_at: now
    };

    await env.DB.prepare(`
      INSERT INTO users (id, email, name, picture, type, device_id, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      guestUser.id, guestUser.email, guestUser.name, guestUser.picture,
      guestUser.type, guestUser.device_id, guestUser.created_at,
      guestUser.updated_at, guestUser.last_login_at
    ).run();

    return guestUser;
  }
}

// JWT 토큰 저장
async function saveAuthToken(env: Bindings, userId: string, token: string): Promise<void> {
  const tokenId = generateId();
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hashedToken = base64UrlEncode(String.fromCharCode(...new Uint8Array(tokenHash)));
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14); // 14일 후 만료

  await env.DB.prepare(`
    INSERT INTO auth_tokens (id, user_id, token_hash, expires_at, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    tokenId, userId, hashedToken, expiresAt.toISOString(),
    new Date().toISOString(), new Date().toISOString()
  ).run();
}

// Authentication middleware
async function getUserFromRequest(c: any): Promise<any> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token);
  return payload;
}

// ============ AUTHENTICATION API ROUTES ============

// Google OAuth 로그인
app.post('/api/auth/google', async (c) => {
  const { env } = c;
  
  try {
    const { credential } = await c.req.json();
    
    if (!credential) {
      return c.json({ error: 'Google credential is required' }, 400);
    }

    // Google JWT 검증
    const googlePayload = await verifyGoogleJWT(credential);
    if (!googlePayload) {
      return c.json({ error: 'Invalid Google credential' }, 401);
    }

    // 사용자 데이터 준비
    const userData = {
      type: 'google',
      google_id: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name,
      picture: googlePayload.picture
    };

    // 사용자 생성 또는 업데이트
    const user = await createOrUpdateUser(env, userData);

    // JWT 토큰 생성
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      type: user.type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60) // 14일
    };

    const token = await createJWT(tokenPayload);

    // 토큰 저장
    await saveAuthToken(env, user.id, token);

    return c.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        type: user.type
      }
    });

  } catch (error) {
    console.error('Google 로그인 에러:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Google OAuth 프로필 기반 로그인
app.post('/api/auth/google-profile', async (c) => {
  const { env } = c;
  
  try {
    const { profile, accessToken } = await c.req.json();
    
    if (!profile || !profile.id) {
      return c.json({ error: 'Invalid Google profile' }, 400);
    }

    // 사용자 데이터 준비
    const userData = {
      type: 'google',
      google_id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    };

    // 사용자 생성 또는 업데이트
    const user = await createOrUpdateUser(env, userData);

    // JWT 토큰 생성
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      type: user.type,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60) // 14일
    };

    const token = await createJWT(tokenPayload);

    // 토큰 저장
    await saveAuthToken(env, user.id, token);

    return c.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        type: user.type
      }
    });

  } catch (error) {
    console.error('Google 프로필 로그인 에러:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// 게스트 로그인
app.post('/api/auth/guest', async (c) => {
  const { env } = c;
  
  try {
    const { deviceId } = await c.req.json();

    // 게스트 사용자 생성
    const userData = {
      type: 'guest',
      deviceId: deviceId || generateId(),
      name: 'Guest User'
    };

    const user = await createOrUpdateUser(env, userData);

    // JWT 토큰 생성
    const tokenPayload = {
      sub: user.id,
      email: null,
      name: user.name,
      picture: null,
      type: user.type,
      deviceId: user.device_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60) // 14일
    };

    const token = await createJWT(tokenPayload);

    // 토큰 저장
    await saveAuthToken(env, user.id, token);

    return c.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: null,
        name: user.name,
        picture: null,
        type: user.type
      }
    });

  } catch (error) {
    console.error('게스트 로그인 에러:', error);
    return c.json({ error: 'Guest authentication failed' }, 500);
  }
});

// 토큰 검증
app.post('/api/auth/verify', async (c) => {
  const { env } = c;
  
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ valid: false, error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verifyJWT(token);

    if (!payload) {
      return c.json({ valid: false, error: 'Invalid token' }, 401);
    }

    // 사용자 존재 확인
    const user = await env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(payload.sub).first();

    if (!user) {
      return c.json({ valid: false, error: 'User not found' }, 401);
    }

    return c.json({ 
      valid: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        type: user.type
      }
    });

  } catch (error) {
    console.error('토큰 검증 에러:', error);
    return c.json({ valid: false, error: 'Token verification failed' }, 500);
  }
});

// API routes

// 1. New color selection API (원복된 기존 방식)
app.post('/api/color/new', async (c) => {
  const { env } = c;
  
  // 기존 간단한 userId 방식으로 원복
  const { userId, excludeColor } = await c.req.json();
  
  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  // Check last completed color for today using original user system
  const lastCompletedColor = await env.DB.prepare(`
    SELECT color FROM completed_collages 
    WHERE user_id = ? AND date = ?
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(userId, getTodayString()).first();

  const excludeColorName = excludeColor || lastCompletedColor?.color;
  const selectedColor = getRandomColor(excludeColorName);

  return c.json({ 
    color: selectedColor,
    date: getTodayString()
  });
});

// 2. Session start API (원복된 기존 방식)
app.post('/api/session/start', async (c) => {
  const { env } = c;
  
  // 기존 간단한 userId 방식으로 원복
  const { userId, color, mode = 'nine' } = await c.req.json();
  
  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  if (!color) {
    return c.json({ error: 'Color is required' }, 400);
  }

  const sessionId = generateId();
  const today = getTodayString();

  // 테이블에 mode 컬럼이 있는지 확인하고, 없으면 추가
  try {
    await env.DB.prepare(`
      ALTER TABLE collage_sessions ADD COLUMN mode TEXT DEFAULT 'nine'
    `).run();
  } catch (error) {
    // 컬럼이 이미 존재하면 무시
  }

  // 기존 user_id 컬럼 사용
  await env.DB.prepare(`
    INSERT INTO collage_sessions (id, user_id, color, start_date, status, mode)
    VALUES (?, ?, ?, ?, 'in_progress', ?)
  `).bind(sessionId, userId, color, today, mode).run();

  return c.json({ 
    sessionId, 
    color, 
    date: today, 
    mode
  });
});

// 3. Get current active session (기존 방식으로 원복)
app.get('/api/session/current/:userId', async (c) => {
  const { env } = c;
  
  // URL에서 userId 파라미터 가져오기
  const userId = c.req.param('userId');
  
  if (!userId) {
    return c.json({ error: 'User ID required' }, 400);
  }

  // 기존 user_id 기반 세션 조회로 원복
  const session = await env.DB.prepare(`
    SELECT * FROM collage_sessions 
    WHERE user_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(userId).first();

  if (!session) {
    return c.json({ session: null });
  }

  // 사진 데이터는 필요시에만 조회 (캐싱 활용)
  const photos = await env.DB.prepare(`
    SELECT id, position, thumbnail_data, created_at FROM photos 
    WHERE session_id = ? 
    ORDER BY position ASC
  `).bind(session.id).all();

  // Add proper URLs to photo data (R2 or Base64)
  const processedPhotos = (photos.results || []).map(photo => {
    if (photo.image_url && photo.thumbnail_url) {
      // R2 method - use API endpoints
      return {
        ...photo,
        image_data: `/api/image/${photo.id}/original`,
        thumbnail_data: `/api/image/${photo.id}/thumbnail`
      };
    } else {
      // Maintain existing Base64 method
      return photo;
    }
  });

  return c.json({ 
    session: {
      ...session,
      photos: processedPhotos
    }
  });
});

// 4. Add photo API (using R2 storage)
app.post('/api/photo/add', async (c) => {
  const { env } = c;
  const { sessionId, position, imageData, thumbnailData } = await c.req.json();

  if (!sessionId || !position || !imageData) {
    return c.json({ error: 'Session ID, position, and image data are required' }, 400);
  }

  const photoId = generateId();

  try {
    // Delete existing photo from R2 if exists
    const existingPhoto = await env.DB.prepare(`
      SELECT * FROM photos WHERE session_id = ? AND position = ?
    `).bind(sessionId, position).first();

    if (existingPhoto) {
      // Delete existing files from R2
      try {
        await env.R2.delete(`photos/${existingPhoto.id}_original.jpg`);
        await env.R2.delete(`photos/${existingPhoto.id}_thumbnail.jpg`);
      } catch (e) {
        console.log('Failed to delete existing files (ignored):', e);
      }
      
      // Delete existing record from DB
      await env.DB.prepare(`
        DELETE FROM photos WHERE session_id = ? AND position = ?
      `).bind(sessionId, position).run();
    }

    // Convert Base64 data to Uint8Array
    const originalImageBuffer = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
    const thumbnailImageBuffer = Uint8Array.from(atob(thumbnailData.split(',')[1]), c => c.charCodeAt(0));
    
    // Check image size limits (10MB for original, 1MB for thumbnail)
    const maxOriginalSize = 10 * 1024 * 1024; // 10MB
    const maxThumbnailSize = 1 * 1024 * 1024;  // 1MB
    
    console.log(`Image sizes: Original=${Math.round(originalImageBuffer.length/1024)}KB, Thumbnail=${Math.round(thumbnailImageBuffer.length/1024)}KB`);
    
    if (originalImageBuffer.length > maxOriginalSize) {
      console.error(`Original image too large: ${originalImageBuffer.length} bytes > ${maxOriginalSize} bytes`);
      return c.json({ error: 'Original image too large (max 10MB)' }, 413);
    }
    
    if (thumbnailImageBuffer.length > maxThumbnailSize) {
      console.error(`Thumbnail image too large: ${thumbnailImageBuffer.length} bytes > ${maxThumbnailSize} bytes`);
      return c.json({ error: 'Thumbnail image too large (max 1MB)' }, 413);
    }

    // Save images to R2
    const originalKey = `photos/${photoId}_original.jpg`;
    const thumbnailKey = `photos/${photoId}_thumbnail.jpg`;

    try {
      await Promise.all([
        env.R2.put(originalKey, originalImageBuffer, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            sessionId: sessionId,
            position: position.toString(),
            type: 'original'
          }
        }),
        env.R2.put(thumbnailKey, thumbnailImageBuffer, {
          httpMetadata: {
            contentType: 'image/jpeg',
          },
          customMetadata: {
            sessionId: sessionId,
            position: position.toString(),
            type: 'thumbnail'
          }
        })
      ]);
      console.log(`Successfully saved images to R2: ${originalKey}, ${thumbnailKey}`);
    } catch (r2Error) {
      console.error('R2 storage error:', {
        error: r2Error,
        message: r2Error.message || 'Unknown R2 error',
        originalSize: originalImageBuffer.length,
        thumbnailSize: thumbnailImageBuffer.length,
        originalKey,
        thumbnailKey
      });
      
      // Check if it's a storage quota error
      if (r2Error.message && r2Error.message.includes('exceed')) {
        return c.json({ error: 'Storage quota exceeded. Please contact support.' }, 507);
      }
      
      throw r2Error; // Re-throw to be caught by outer catch
    }

    // Save only metadata to DB (store R2 key paths)
    await env.DB.prepare(`
      INSERT INTO photos (id, session_id, position, image_url, thumbnail_url)
      VALUES (?, ?, ?, ?, ?)
    `).bind(photoId, sessionId, position, originalKey, thumbnailKey).run();

    // Update session timestamp
    await env.DB.prepare(`
      UPDATE collage_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(sessionId).run();

    return c.json({ 
      photoId, 
      success: true,
      originalUrl: `/api/image/${photoId}/original`,
      thumbnailUrl: `/api/image/${photoId}/thumbnail`
    });

  } catch (error) {
    console.error('Photo save error:', error);
    return c.json({ error: 'Failed to save photo' }, 500);
  }
});

// 5. Image retrieval API (return images from R2)
app.get('/api/image/:photoId/:type', async (c) => {
  const { env } = c;
  const photoId = c.req.param('photoId');
  const type = c.req.param('type'); // 'original' or 'thumbnail'

  try {
    const photo = await env.DB.prepare(`
      SELECT * FROM photos WHERE id = ?
    `).bind(photoId).first();

    if (!photo) {
      return c.notFound();
    }

    const imageKey = type === 'original' ? photo.image_url : photo.thumbnail_url;
    const imageObject = await env.R2.get(imageKey);

    if (!imageObject) {
      return c.notFound();
    }

    return new Response(imageObject.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // 1년 캐싱
        'ETag': imageObject.etag
      }
    });

  } catch (error) {
    console.error('이미지 조회 오류:', error);
    return c.json({ error: 'Failed to fetch image' }, 500);
  }
});

// 6. 사진 삭제 API (R2 파일도 함께 삭제)
app.delete('/api/photo/:photoId', async (c) => {
  const { env } = c;
  const photoId = c.req.param('photoId');

  try {
    // DB에서 사진 정보 조회
    const photo = await env.DB.prepare(`
      SELECT * FROM photos WHERE id = ?
    `).bind(photoId).first();

    if (photo) {
      // R2에서 파일 삭제
      await Promise.all([
        env.R2.delete(photo.image_url),
        env.R2.delete(photo.thumbnail_url)
      ]);
    }

    // DB에서 레코드 삭제
    await env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(photoId).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('사진 삭제 오류:', error);
    return c.json({ error: 'Failed to delete photo' }, 500);
  }
});

// 6. 콜라주 완성 API
app.post('/api/collage/complete', async (c) => {
  const { env } = c;
  const { sessionId, collageData } = await c.req.json();

  if (!sessionId || !collageData) {
    return c.json({ error: 'Session ID and collage data are required' }, 400);
  }

  // 세션 정보 조회
  const session = await env.DB.prepare(`
    SELECT * FROM collage_sessions WHERE id = ?
  `).bind(sessionId).first();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const collageId = generateId();
  const completedAt = new Date().toISOString();

  // 기존 완성된 콜라주가 있는지 확인
  const existingCollage = await env.DB.prepare(`
    SELECT id FROM completed_collages WHERE session_id = ?
  `).bind(sessionId).first();

  if (existingCollage) {
    // 기존 콜라주 업데이트
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE completed_collages 
        SET collage_data = ?
        WHERE session_id = ?
      `).bind(collageData, sessionId),
      
      env.DB.prepare(`
        UPDATE collage_sessions 
        SET status = 'completed', completed_at = ? 
        WHERE id = ?
      `).bind(completedAt, sessionId)
    ]);

    return c.json({ collageId: existingCollage.id, success: true, updated: true });
  } else {
    // 새 콜라주 생성
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO completed_collages (id, session_id, user_id, color, date, collage_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(collageId, sessionId, session.user_id, session.color, session.start_date, collageData),
      
      env.DB.prepare(`
        UPDATE collage_sessions 
        SET status = 'completed', completed_at = ? 
        WHERE id = ?
      `).bind(completedAt, sessionId)
    ]);

    return c.json({ collageId, success: true });
  }

  return c.json({ collageId, success: true });
});

// 7. 사용자 이력 조회 (날짜별)
app.get('/api/history/:userId', async (c) => {
  const { env } = c;
  const userId = c.req.param('userId');
  const colorFilter = c.req.query('color');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = `
    SELECT * FROM completed_collages 
    WHERE user_id = ?
  `;
  const params = [userId];

  if (colorFilter) {
    query += ` AND color = ?`;
    params.push(colorFilter);
  }

  query += ` ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const collages = await env.DB.prepare(query).bind(...params).all();

  return c.json({ 
    collages: collages.results || [],
    hasMore: (collages.results?.length || 0) === limit
  });
});

// 8. 컬러별 통계 API
app.get('/api/stats/:userId', async (c) => {
  const { env } = c;
  const userId = c.req.param('userId');

  const stats = await env.DB.prepare(`
    SELECT 
      color,
      COUNT(*) as count,
      MAX(date) as last_date
    FROM completed_collages 
    WHERE user_id = ?
    GROUP BY color
    ORDER BY count DESC
  `).bind(userId).all();

  return c.json({ stats: stats.results || [] });
});

// 언어 감지 함수
function detectLanguage(c: any): string {
  // URL 파라미터로 언어 지정
  const langParam = c.req.query('lang');
  if (langParam === 'en' || langParam === 'ko') {
    return langParam;
  }
  
  // Accept-Language 헤더에서 언어 감지
  const acceptLanguage = c.req.header('Accept-Language') || '';
  
  // 한국어 감지
  if (acceptLanguage.includes('ko')) {
    return 'ko';
  }
  
  // 기본값은 영어
  return 'en';
}

// SEO 파일들 (정적 제공)
app.get('/robots.txt', async (c) => {
  return c.text(`User-agent: *
Allow: /

# 사이트맵
Sitemap: https://colorhunt.app/sitemap.xml

# 크롤링 최적화
Crawl-delay: 1

# 불필요한 디렉토리 제외
Disallow: /api/
Disallow: /static/tmp/
Disallow: /_worker.js
Disallow: /_routes.json`, 200, {
    'Content-Type': 'text/plain'
  })
})

app.get('/sitemap.xml', async (c) => {
  return c.text(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://colorhunt.app/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://colorhunt.app/?lang=ko" />
    <xhtml:link rel="alternate" hreflang="en" href="https://colorhunt.app/?lang=en" />
  </url>
  <url>
    <loc>https://colorhunt.app/?lang=ko</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://colorhunt.app/?lang=en</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`, 200, {
    'Content-Type': 'application/xml'
  })
})

// 메인 페이지
app.get('/', (c) => {
  const { env } = c;
  const lang = detectLanguage(c);
  
  return c.render(
    <div class="min-h-screen flex items-center justify-center p-2">
      <div class="w-full max-w-md mx-auto text-center">
        <div id="app"></div>
      </div>
    </div>,
    { gaId: env.GA_MEASUREMENT_ID, lang }
  )
})

// SPA Catch-All 라우트 (모든 비-API 경로를 SPA로 처리)
app.get('/*', (c) => {
  const { env } = c;
  const lang = detectLanguage(c);
  console.log(`🔗 SPA Catch-All: ${c.req.path}, Language: ${lang}`);
  
  // 기존 메인 페이지와 동일한 SPA 렌더링
  return c.render(
    <div class="min-h-screen flex items-center justify-center p-2">
      <div class="w-full max-w-md mx-auto text-center">
        <div id="app"></div>
      </div>
    </div>,
    { gaId: env.GA_MEASUREMENT_ID, lang }
  )
})

export default app
