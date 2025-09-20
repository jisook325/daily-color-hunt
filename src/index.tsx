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

  return c.json({ 
    session: {
      ...session,
      photos: photos.results || []
    }
  });
});

// 4. 사진 추가 API
app.post('/api/photo/add', async (c) => {
  const { env } = c;
  const { sessionId, position, imageData, thumbnailData } = await c.req.json();

  if (!sessionId || !position || !imageData) {
    return c.json({ error: 'Session ID, position, and image data are required' }, 400);
  }

  const photoId = generateId();

  // 기존 위치의 사진이 있다면 삭제
  await env.DB.prepare(`
    DELETE FROM photos WHERE session_id = ? AND position = ?
  `).bind(sessionId, position).run();

  // 새 사진 추가
  await env.DB.prepare(`
    INSERT INTO photos (id, session_id, position, image_data, thumbnail_data)
    VALUES (?, ?, ?, ?, ?)
  `).bind(photoId, sessionId, position, imageData, thumbnailData).run();

  // 세션 업데이트 시간 갱신
  await env.DB.prepare(`
    UPDATE collage_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(sessionId).run();

  return c.json({ photoId, success: true });
});

// 5. 사진 삭제 API
app.delete('/api/photo/:photoId', async (c) => {
  const { env } = c;
  const photoId = c.req.param('photoId');

  await env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(photoId).run();

  return c.json({ success: true });
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
  return c.render(
    <div>
      <h1>🎨 Color Hunt</h1>
      <p>오늘의 컬러를 찾아 9장의 사진으로 콜라주를 만들어보세요!</p>
      <div id="app"></div>
    </div>
  )
})

export default app
