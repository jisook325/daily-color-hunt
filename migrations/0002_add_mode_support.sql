-- Add mode support for unlimited vs 9-grid collages
-- Mode: 'nine' (9개 모드) or 'unlimited' (무제한 모드)

-- Add mode column to collage_sessions
ALTER TABLE collage_sessions ADD COLUMN mode TEXT DEFAULT 'nine';

-- Add mode column to completed_collages  
ALTER TABLE completed_collages ADD COLUMN mode TEXT DEFAULT 'nine';

-- Update photos table to support up to 15 positions for unlimited mode
-- (기존 position 컬럼은 그대로 사용, 1-15 범위로 확장)

-- Add index for mode filtering
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON collage_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_collages_mode ON completed_collages(mode);