const attempts = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS = 5

export function rateLimit(key: string): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { success: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: MAX_ATTEMPTS - entry.count }
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(key)
  }
}, 30 * 60 * 1000).unref?.()
