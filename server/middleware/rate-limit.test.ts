import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { createRateLimiter, resetRateLimitStore } from './rate-limit'

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  it('should allow requests below the limit', async () => {
    const app = new Hono()
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 })
    app.use('*', limiter)
    app.get('/', (c) => c.text('OK'))

    const res1 = await app.request('/')
    expect(res1.status).toBe(200)
    expect(res1.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('1')

    const res2 = await app.request('/')
    expect(res2.status).toBe(200)
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should block requests above the limit', async () => {
    const app = new Hono()
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 })
    app.use('*', limiter)
    app.get('/', (c) => c.text('OK'))

    await app.request('/')
    await app.request('/')

    // 3rd request should fail
    const res3 = await app.request('/')
    expect(res3.status).toBe(429)
    expect(res3.headers.get('Retry-After')).toBeDefined()
    expect(res3.headers.get('X-RateLimit-Remaining')).toBe('0')

    const body = await res3.json()
    expect(body.error).toContain('Rate limit exceeded')
  })

  it('should allow requests again after window expires', async () => {
    const app = new Hono()
    // 50ms window for fast testing
    const limiter = createRateLimiter({ windowMs: 50, max: 1 })
    app.use('*', limiter)
    app.get('/', (c) => c.text('OK'))

    await app.request('/')
    const resBlocked = await app.request('/')
    expect(resBlocked.status).toBe(429)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60))

    const resAllowed = await app.request('/')
    expect(resAllowed.status).toBe(200)
  })

  it('should track limits separately for different IPs', async () => {
    const app = new Hono()
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 })
    app.use('*', limiter)
    app.get('/', (c) => c.text('OK'))

    const req1 = new Request('http://localhost/')
    req1.headers.set('x-forwarded-for', '1.1.1.1')
    const res1 = await app.fetch(req1)
    expect(res1.status).toBe(200)

    const req2 = new Request('http://localhost/')
    req2.headers.set('x-forwarded-for', '2.2.2.2')
    const res2 = await app.fetch(req2)
    expect(res2.status).toBe(200)

    // 2nd request for 1.1.1.1 fails
    const res3 = await app.fetch(req1)
    expect(res3.status).toBe(429)
  })
})
