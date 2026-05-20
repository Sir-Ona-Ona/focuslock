import { db } from '../db/index.js'
import { dailyCounters } from '../db/schema.js'
import { lt } from 'drizzle-orm'

// Delete yesterday's (and older) daily counter rows at midnight each day.
// Called once on startup; reschedules itself for the next midnight.
export function startMidnightCron(): void {
  scheduleNextRun()
}

function scheduleNextRun(): void {
  const now    = new Date()
  const next   = new Date(now)
  next.setHours(24, 0, 0, 0) // next midnight (local)
  const delay  = next.getTime() - now.getTime()

  setTimeout(async () => {
    await runReset()
    scheduleNextRun()
  }, delay)

  console.log(`[cron] daily-counter reset scheduled for ${next.toISOString()}`)
}

async function runReset(): Promise<void> {
  // Keep today's row (if any); delete everything before it
  const today = localDate()
  try {
    await db.delete(dailyCounters).where(lt(dailyCounters.date, today))
    console.log(`[cron] daily counters reset for dates before ${today}`)
  } catch (err) {
    console.error('[cron] reset failed:', err)
  }
}

function localDate(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
}
