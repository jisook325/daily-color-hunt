-- Color Hunt Database Schema
-- 사용자 세션 및 콜라주 데이터 저장

-- 콜라주 세션 테이블
CREATE TABLE IF NOT EXISTS collage_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- 브라우저 기반 UUID
  color TEXT NOT NULL,   -- 선택된 컬러 (red, blue, green, etc.)
  start_date TEXT NOT NULL, -- 시작 날짜 (YYYY-MM-DD)
  status TEXT DEFAULT 'in_progress', -- 'in_progress' or 'completed'
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 개별 사진 테이블
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL, -- 1-9 (3x3 그리드 위치)
  image_data TEXT, -- base64 인코딩된 이미지 데이터 (임시)
  thumbnail_data TEXT, -- 썸네일 데이터
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES collage_sessions(id) ON DELETE CASCADE
);

-- 완성된 콜라주 테이블
CREATE TABLE IF NOT EXISTS completed_collages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  color TEXT NOT NULL,
  date TEXT NOT NULL, -- 완성 날짜 (YYYY-MM-DD)
  collage_data TEXT, -- 최종 콜라주 이미지 데이터
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES collage_sessions(id),
  UNIQUE(session_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON collage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_color ON collage_sessions(color);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON collage_sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_position ON photos(session_id, position);
CREATE INDEX IF NOT EXISTS idx_collages_user ON completed_collages(user_id);
CREATE INDEX IF NOT EXISTS idx_collages_date ON completed_collages(date);
CREATE INDEX IF NOT EXISTS idx_collages_color ON completed_collages(color);