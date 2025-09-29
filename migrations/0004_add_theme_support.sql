-- Add theme support for multi-tenant architecture
-- Supports both 'main' and 'idol-fanclub' themes

-- Add theme column to collage_sessions table
ALTER TABLE collage_sessions 
ADD COLUMN theme TEXT DEFAULT 'main' NOT NULL;

-- Add theme column to completed_collages table  
ALTER TABLE completed_collages 
ADD COLUMN theme TEXT DEFAULT 'main' NOT NULL;

-- Update photos table position limit for 15-photo support (3x5 grid)
-- Note: SQLite doesn't support ALTER COLUMN, so we use a comment for documentation
-- position INTEGER NOT NULL, -- 1-15 (3x5 grid for idol-fanclub theme, 1-9 for main theme)

-- Create indexes for theme-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_theme ON collage_sessions(theme);
CREATE INDEX IF NOT EXISTS idx_sessions_user_theme ON collage_sessions(user_id, theme);
CREATE INDEX IF NOT EXISTS idx_collages_theme ON completed_collages(theme);
CREATE INDEX IF NOT EXISTS idx_collages_user_theme ON completed_collages(user_id, theme);

-- Update existing records to 'main' theme (default)
UPDATE collage_sessions SET theme = 'main' WHERE theme IS NULL OR theme = '';
UPDATE completed_collages SET theme = 'main' WHERE theme IS NULL OR theme = '';