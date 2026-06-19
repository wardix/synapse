import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import searchRoute from './search'

const app = new Hono()
app.route('/api/search', searchRoute)

// Note: since this uses searchFTS and searchSemantic internally which hit the database,
// these tests will require a running DB and might rely on the records created by other tests or migrations.
// We mock global.fetch just to ensure semantic search embedding generation doesn't fail.

describe('Search Routes', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'valid-key'
    global.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          embedding: { values: new Array(768).fill(0.1) },
        }),
        { status: 200 },
      )
    })
  })

  it('GET /api/search > should return 400 if q is missing', async () => {
    const res = await app.request('/api/search')
    expect(res.status).toBe(400)
    // biome-ignore lint/suspicious/noExplicitAny: record type
    const body = (await res.json()) as any
    expect(body.error).toBe('Query parameter "q" is required')
  })

  it('GET /api/search > should return 400 if mode is invalid', async () => {
    const res = await app.request('/api/search?q=test&mode=magic')
    expect(res.status).toBe(400)
  })

  it('GET /api/search > should perform hybrid search by default', async () => {
    const res = await app.request('/api/search?q=test')
    expect(res.status).toBe(200)
    // biome-ignore lint/suspicious/noExplicitAny: record type
    const body = (await res.json()) as any
    expect(body.data.mode).toBe('hybrid')
    expect(body.data.results).toBeInstanceOf(Array)
    expect(body.data.total).toBeGreaterThanOrEqual(0)
  })

  it('GET /api/search > should perform fts search when requested', async () => {
    const res = await app.request('/api/search?q=test&mode=fts')
    expect(res.status).toBe(200)
    // biome-ignore lint/suspicious/noExplicitAny: record type
    const body = (await res.json()) as any
    expect(body.data.mode).toBe('fts')
  })

  it('GET /api/search > should perform semantic search when requested', async () => {
    const res = await app.request('/api/search?q=test&mode=semantic')
    expect(res.status).toBe(200)
    // biome-ignore lint/suspicious/noExplicitAny: record type
    const body = (await res.json()) as any
    expect(body.data.mode).toBe('semantic')
  })
})
