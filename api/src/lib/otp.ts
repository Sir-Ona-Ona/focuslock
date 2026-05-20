import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'

/** Generate a random 6-digit numeric OTP string. */
export function generateOtp(): string {
  return String(randomInt(100000, 999999))
}

/** Hash an OTP for safe storage. */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

/** Compare a plaintext OTP against a stored hash. */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}

/** Return a Date that is `seconds` from now. */
export function ttlDate(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

/** Format a Date as YYYY-MM-DD in local time. */
export function localDateString(d = new Date()): string {
  return d.toLocaleDateString('en-CA') // "YYYY-MM-DD"
}
