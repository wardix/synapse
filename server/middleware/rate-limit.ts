import type { Context, Next } from 'hono'

type RateLimitOptions = {
  windowMs: number
  max: number
  message?: string
}

type ClientData = {
  timestamps: number[]
}

const store = new Map<string, ClientData>()

// Clean up expired entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of store.entries()) {
    // Keep only timestamps within the longest possible window (assuming 1 minute max for now)
    // To be safe, we'll use a fixed 60s cleanup window. Or we can just check if array is empty
    // Actually, it's better to clear it based on the maximum window we use (which is 60s).
    const windowStart = now - 60000
    data.timestamps = data.timestamps.filter((ts) => ts > windowStart)
    if (data.timestamps.length === 0) {
      store.delete(key)
    }
  }
}, 60000)

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Rate limit exceeded. Try again in',
  } = options

  return async (c: Context, next: Next) => {
    // Determine the client key (IP or user ID if authenticated)
    // We will use user ID if available, otherwise IP
    // Note: c.get('user') might be set by authMiddleware, but rate limiter might run before auth
    // So we primarily rely on IP, and optionally user ID.
    const ip =
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      c.env?.REMOTE_ADDR ||
      'unknown'

    // biome-ignore lint/suspicious/noExplicitAny: auth context
    const user = (c.get as any)('user')
    const key = user ? `user:${user.userId}` : `ip:${ip}`

    const now = Date.now()
    const windowStart = now - windowMs

    let clientData = store.get(key)
    if (!clientData) {
      clientData = { timestamps: [] }
      store.set(key, clientData)
    }

    // Filter out expired timestamps
    clientData.timestamps = clientData.timestamps.filter(
      (ts) => ts > windowStart,
    )

    const requestCount = clientData.timestamps.length

    // Calculate reset time (when the oldest request in the window expires)
    const oldestRequest = requestCount > 0 ? clientData.timestamps[0] : now
    const resetTime = oldestRequest + windowMs
    const resetSeconds = Math.ceil(resetTime / 1000)
    const retryAfter = Math.ceil((resetTime - now) / 1000) || 1

    if (requestCount >= max) {
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', resetSeconds.toString())
      c.header('Retry-After', retryAfter.toString())

      return c.json(
        {
          data: null,
          error: `${message} ${retryAfter} seconds.`,
        },
        429,
      )
    }

    // Add current request
    clientData.timestamps.push(now)

    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', (max - requestCount - 1).toString())
    c.header('X-RateLimit-Reset', resetSeconds.toString())

    await next()
  }
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 5,
})

export const chatRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 10,
})

export const searchRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
})

export const generalRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 60,
})

// Helper to reset store for tests
export const resetRateLimitStore = () => {
  store.clear()
}
