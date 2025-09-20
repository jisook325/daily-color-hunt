-- R2 스토리지 지원을 위한 데이터베이스 스키마 업데이트

-- photos 테이블에 R2 URL 컬럼 추가
ALTER TABLE photos ADD COLUMN image_url TEXT;
ALTER TABLE photos ADD COLUMN thumbnail_url TEXT;

-- 기존 Base64 데이터 컬럼들을 nullable로 변경 (점진적 마이그레이션)
-- 새로운 사진들은 R2를 사용하고, 기존 사진들은 Base64를 유지

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_photos_urls ON photos(image_url, thumbnail_url);