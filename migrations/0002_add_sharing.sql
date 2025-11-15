-- Migration: Add estimate sharing functionality
-- This migration adds the ability to share estimates with other users (read-only access)

-- Table to track which estimates are shared with which users
CREATE TABLE IF NOT EXISTS estimate_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id TEXT NOT NULL,
    owner_user_id INTEGER NOT NULL,
    shared_with_user_id INTEGER NOT NULL,
    shared_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Ensure each estimate can only be shared once with each user
    UNIQUE(estimate_id, shared_with_user_id)
);

-- Index for efficient lookups when querying estimates shared with a user
CREATE INDEX IF NOT EXISTS idx_estimate_shares_shared_with
ON estimate_shares(shared_with_user_id);

-- Index for efficient lookups when querying who an estimate is shared with
CREATE INDEX IF NOT EXISTS idx_estimate_shares_estimate
ON estimate_shares(estimate_id);
