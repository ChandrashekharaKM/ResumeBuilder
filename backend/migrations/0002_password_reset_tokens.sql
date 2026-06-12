-- Migration 0002: Password reset tokens table
-- Tokens are one-time use, expire in 1 hour, stored as SHA-256 hashes

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,                     -- UUID
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,         -- SHA-256 of the raw token sent in email
    expires_at DATETIME NOT NULL,            -- 1 hour from creation
    used_at DATETIME,                        -- NULL until redeemed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
