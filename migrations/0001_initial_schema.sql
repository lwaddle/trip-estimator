-- Initial schema for trip estimator application

-- Users table to store user information from Zero Trust
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Estimates table to store all trip estimates
CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    estimate_data TEXT NOT NULL, -- JSON blob containing all estimate details
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);

-- Index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_estimates_updated_at ON estimates(updated_at DESC);
