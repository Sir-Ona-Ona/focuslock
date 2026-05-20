import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// status: 'pending' until partner clicks consent link, then 'active'
export const partners = sqliteTable('partners', {
  id:                 text('id').primaryKey(),
  userId:             text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:               text('name').notNull(),
  email:              text('email').notNull(),
  status:             text('status').notNull().default('pending'), // 'pending' | 'active'
  consentTokenHash:   text('consent_token_hash'),
  consentExpiresAt:   integer('consent_expires_at', { mode: 'timestamp' }),
  codesIssued:        integer('codes_issued').notNull().default(0),
  since:              integer('since', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export const domains = sqliteTable('domains', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domain:    text('domain').notNull(),
  category:  text('category').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// hourMask: JSON bool[24], true = blocked
export const schedules = sqliteTable('schedules', {
  id:       text('id').primaryKey(),
  userId:   text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  day:      integer('day').notNull(), // 0=Mon … 6=Sun
  hourMask: text('hour_mask').notNull().default('[]'),
})

export const userSettings = sqliteTable('user_settings', {
  userId:              text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  graceWindowMin:      integer('grace_window_min').notNull().default(10),
  dailyUnlockMax:      integer('daily_unlock_max').notNull().default(5),
  settingsSealedUntil: integer('settings_sealed_until', { mode: 'timestamp' }),
  // Disable flow
  disableRequestedAt:  integer('disable_requested_at', { mode: 'timestamp' }),
  disableConfirmsAt:   integer('disable_confirms_at', { mode: 'timestamp' }), // requestedAt + 24h
  disabledAt:          integer('disabled_at', { mode: 'timestamp' }),
})

export const otpCodes = sqliteTable('otp_codes', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domain:      text('domain').notNull(),
  codeHash:    text('code_hash').notNull(),
  purpose:     text('purpose').notNull().default('unlock'), // 'unlock' | 'settings' | 'disable'
  requestedAt: integer('requested_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  sentAt:      integer('sent_at', { mode: 'timestamp' }),
  usedAt:      integer('used_at', { mode: 'timestamp' }),
  expiresAt:   integer('expires_at', { mode: 'timestamp' }).notNull(),
})

export const graceWindows = sqliteTable('grace_windows', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domain:    text('domain').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

export const unlockHistory = sqliteTable('unlock_history', {
  id:           text('id').primaryKey(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  domain:       text('domain').notNull(),
  requestedAt:  integer('requested_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  outcome:      text('outcome').notNull(), // 'validated' | 'denied' | 'expired' | 'ratelimited'
  durationUsed: integer('duration_used'),  // seconds
})

export const dailyCounters = sqliteTable('daily_counters', {
  id:      text('id').primaryKey(),
  userId:  text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:    text('date').notNull(), // YYYY-MM-DD
  unlocks: integer('unlocks').notNull().default(0),
})
