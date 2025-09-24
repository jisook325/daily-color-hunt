-- User Authentication System Migration
-- Adds user accounts, OAuth integration, and updates existing schema

-- Users table for authenticated accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- UUID for internal use
  email TEXT UNIQUE,                      -- Email address (null for guests)
  name TEXT NOT NULL,                     -- Display name
  picture TEXT,                           -- Profile picture URL
  type TEXT NOT NULL DEFAULT 'guest',     -- 'google' or 'guest'
  google_id TEXT UNIQUE,                  -- Google account ID (null for guests)
  device_id TEXT,                         -- Original device-based ID for migration
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- JWT tokens table for session management
CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,                    -- Token ID
  user_id TEXT NOT NULL,                  -- Reference to users table
  token_hash TEXT NOT NULL,               -- Hashed JWT token
  expires_at DATETIME NOT NULL,           -- Expiration date (14 days)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update collage_sessions to reference the new users table
-- Add user_id_new column temporarily for migration
ALTER TABLE collage_sessions ADD COLUMN user_id_new TEXT;

-- Photos table already has image_url and thumbnail_url from previous migration
-- No need to add these columns again

-- Update completed_collages for new user system
ALTER TABLE completed_collages ADD COLUMN user_id_new TEXT;
ALTER TABLE completed_collages ADD COLUMN collage_url TEXT;  -- R2 URL for final collage

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);

CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON auth_tokens(token_hash);

-- Indexes for updated foreign keys
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_new ON collage_sessions(user_id_new);
CREATE INDEX IF NOT EXISTS idx_collages_user_new ON completed_collages(user_id_new);