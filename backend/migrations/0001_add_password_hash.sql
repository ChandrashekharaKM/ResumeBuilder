-- Migration 0001: Add password_hash to users table for native email/password auth
-- Run via: wrangler d1 migrations apply holdmyresume-db --local

ALTER TABLE users ADD COLUMN password_hash TEXT;
