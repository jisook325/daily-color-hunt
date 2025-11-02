-- 완성된 콜라주 메타데이터 - 새 컬럼 추가
-- 기존 테이블: id, session_id, user_id, color, date, collage_data, created_at, mode, user_id_new, collage_url
-- 새로 추가: photo_count, r2_key, file_size

-- photo_count 컬럼 추가 (사진 개수)
ALTER TABLE completed_collages ADD COLUMN photo_count INTEGER DEFAULT 0;

-- r2_key 컬럼 추가 (R2 object key)
ALTER TABLE completed_collages ADD COLUMN r2_key TEXT DEFAULT '';

-- file_size 컬럼 추가 (파일 크기 bytes)
ALTER TABLE completed_collages ADD COLUMN file_size INTEGER DEFAULT 0;

-- 인덱스 생성 (created_at은 이미 있음)
CREATE INDEX IF NOT EXISTS idx_completed_collages_user_id ON completed_collages(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_collages_session_id ON completed_collages(session_id);

-- 개별 사진 메타데이터 (선택적 - 나중에 필요하면 추가)
-- CREATE TABLE IF NOT EXISTS collage_photos (
--   id TEXT PRIMARY KEY,
--   collage_id TEXT NOT NULL,
--   position INTEGER NOT NULL,
--   r2_key TEXT NOT NULL,
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   
--   FOREIGN KEY (collage_id) REFERENCES completed_collages(id)
-- );
