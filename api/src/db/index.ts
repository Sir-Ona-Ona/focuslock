import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema.js'

const url = `file:${process.env.DB_PATH ?? './focuslock.db'}`

const client = createClient({ url })

export const db = drizzle(client, { schema })

const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    consent_token_hash TEXT,
    consent_expires_at INTEGER,
    codes_issued INTEGER NOT NULL DEFAULT 0,
    since INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    hour_mask TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    grace_window_min INTEGER NOT NULL DEFAULT 10,
    daily_unlock_max INTEGER NOT NULL DEFAULT 5,
    settings_sealed_until INTEGER,
    disable_requested_at INTEGER,
    disable_confirms_at INTEGER,
    disabled_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'unlock',
    requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
    sent_at INTEGER,
    used_at INTEGER,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS grace_windows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    started_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS unlock_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
    outcome TEXT NOT NULL,
    duration_used INTEGER
  );
  CREATE TABLE IF NOT EXISTS daily_counters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    unlocks INTEGER NOT NULL DEFAULT 0
  );
`

// Columns added after initial release — silently ignored if already present
const MIGRATIONS = [
  `ALTER TABLE partners ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`,
  `ALTER TABLE partners ADD COLUMN consent_token_hash TEXT`,
  `ALTER TABLE partners ADD COLUMN consent_expires_at INTEGER`,
  `ALTER TABLE user_settings ADD COLUMN disable_requested_at INTEGER`,
  `ALTER TABLE user_settings ADD COLUMN disable_confirms_at INTEGER`,
]

// Push schema on startup (dev convenience — use drizzle-kit migrate in prod)
export async function initDb() {
  await client.executeMultiple(DDL)
  await client.execute('PRAGMA foreign_keys = ON')
  for (const sql of MIGRATIONS) {
    try { await client.execute(sql) } catch { /* column already exists */ }
  }
}
