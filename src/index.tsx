import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

// 컬러 상수 정의 (무지개 7색 + 흰색 + 검정색)
const COLORS = [
  { name: 'red', hex: '#FF0000', korean: '빨강' },
  { name: 'orange', hex: '#FF8C00', korean: '주황' },
  { name: 'yellow', hex: '#FFD700', korean: '노랑' },
  { name: 'green', hex: '#00FF00', korean: '초록' },
  { name: 'blue', hex: '#0066FF', korean: '파랑' },
  { name: 'indigo', hex: '#4B0082', korean: '남색' },
  { name: 'purple', hex: '#8A2BE2', korean: '보라' },
  { name: 'white', hex: '#FFFFFF', korean: '흰색' },
  { name: 'black', hex: '#000000', korean: '검정' }
];

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  GA_MEASUREMENT_ID?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))
app.use(renderer)

// 유틸리티 함수들
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

// API 라우트들

// 1. 새로운 컬러 선택 API
app.post('/api/color/new', async (c) => {
  const { env } = c;
  const { userId, excludeColor } = await c.req.json();

  if (!userId) {
    return c.json({ error: 'User ID is required' }, 400);
  }

  // 오늘 완료한 마지막 컬러 확인
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

// 2. 새 세션 시작 API
app.post('/api/session/start', async (c) => {
  const { env } = c;
  const { userId, color } = await c.req.json();

  if (!userId || !color) {
    return c.json({ error: 'User ID and color are required' }, 400);
  }

  const sessionId = generateId();
  const today = getTodayString();

  await env.DB.prepare(`
    INSERT INTO collage_sessions (id, user_id, color, start_date, status)
    VALUES (?, ?, ?, ?, 'in_progress')
  `).bind(sessionId, userId, color, today).run();

  return c.json({ sessionId, color, date: today });
});

// 3. 현재 진행 중인 세션 조회
app.get('/api/session/current/:userId', async (c) => {
  const { env } = c;
  const userId = c.req.param('userId');

  const session = await env.DB.prepare(`
    SELECT * FROM collage_sessions 
    WHERE user_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(userId).first();

  if (!session) {
    return c.json({ session: null });
  }

  // 해당 세션의 사진들도 함께 조회
  const photos = await env.DB.prepare(`
    SELECT * FROM photos 
    WHERE session_id = ? 
    ORDER BY position ASC
  `).bind(session.id).all();

  // 사진 데이터에 올바른 URL 추가 (R2 또는 Base64)
  const processedPhotos = (photos.results || []).map(photo => {
    if (photo.image_url && photo.thumbnail_url) {
      // R2 방식 - API 엔드포인트 사용
      return {
        ...photo,
        image_data: `/api/image/${photo.id}/original`,
        thumbnail_data: `/api/image/${photo.id}/thumbnail`
      };
    } else {
      // 기존 Base64 방식 유지
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

// 4. 사진 추가 API (R2 스토리지 사용)
app.post('/api/photo/add', async (c) => {
  const { env } = c;
  const { sessionId, position, imageData, thumbnailData } = await c.req.json();

  if (!sessionId || !position || !imageData) {
    return c.json({ error: 'Session ID, position, and image data are required' }, 400);
  }

  const photoId = generateId();

  try {
    // 기존 사진이 있다면 R2에서 삭제
    const existingPhoto = await env.DB.prepare(`
      SELECT * FROM photos WHERE session_id = ? AND position = ?
    `).bind(sessionId, position).first();

    if (existingPhoto) {
      // R2에서 기존 파일들 삭제
      try {
        await env.R2.delete(`photos/${existingPhoto.id}_original.jpg`);
        await env.R2.delete(`photos/${existingPhoto.id}_thumbnail.jpg`);
      } catch (e) {
        console.log('기존 파일 삭제 실패 (무시):', e);
      }
      
      // DB에서 기존 레코드 삭제
      await env.DB.prepare(`
        DELETE FROM photos WHERE session_id = ? AND position = ?
      `).bind(sessionId, position).run();
    }

    // Base64 데이터를 Uint8Array로 변환
    const originalImageBuffer = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
    const thumbnailImageBuffer = Uint8Array.from(atob(thumbnailData.split(',')[1]), c => c.charCodeAt(0));

    // R2에 이미지 저장
    const originalKey = `photos/${photoId}_original.jpg`;
    const thumbnailKey = `photos/${photoId}_thumbnail.jpg`;

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

    // DB에 메타데이터만 저장 (R2 키 경로 저장)
    await env.DB.prepare(`
      INSERT INTO photos (id, session_id, position, image_url, thumbnail_url)
      VALUES (?, ?, ?, ?, ?)
    `).bind(photoId, sessionId, position, originalKey, thumbnailKey).run();

    // 세션 업데이트 시간 갱신
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
    console.error('사진 저장 오류:', error);
    return c.json({ error: 'Failed to save photo' }, 500);
  }
});

// 5. 이미지 조회 API (R2에서 이미지 반환)
app.get('/api/image/:photoId/:type', async (c) => {
  const { env } = c;
  const photoId = c.req.param('photoId');
  const type = c.req.param('type'); // 'original' 또는 'thumbnail'

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

  // 트랜잭션으로 처리
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

// 메인 페이지
app.get('/', (c) => {
  const { env } = c;
  return c.render(
    <div>
      <h1>🎨 Color Hunt</h1>
      <p>오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!</p>
      <div id="app"></div>
    </div>,
    { gaId: env.GA_MEASUREMENT_ID }
  )
})

export default app
