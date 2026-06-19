import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection'
import { signToken } from '../services/auth'
import authRoute from './auth'
import semanticIndex from './semantic-index'

const app = new Hono()
app.route('/api/auth', authRoute)
app.route('/api/semantic-index', semanticIndex)

describe('Semantic Index Routes', () => {
  let token: string
  let userId: number
  const originalFetch = global.fetch

  beforeAll(async () => {
    const rand = Math.random().toString(36).substring(7)
    let uid = 1
    try {
      const users = await sql`
        INSERT INTO users (username, email, password_hash)
        VALUES (${`semantic_${rand}`}, ${`semantic_${rand}@test.com`}, 'hash')
        RETURNING id
      `
      if (users && users.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: record
        uid = (users[0] as any).id
      }
    } catch (_e) {
      // ignore
    }
    userId = uid
    token = await signToken({ userId, email: `semantic_${rand}@test.com` })

    process.env.GEMINI_API_KEY = 'valid-key'
    global.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          embedding: {
            values: new Array(768).fill(0.1),
          },
        }),
        { status: 200 },
      )
    })
  })

  afterAll(async () => {
    await sql`DELETE FROM users WHERE id = ${userId}`
    global.fetch = originalFetch
  })

  it('GET /api/semantic-index > should return paginated entries', async () => {
    await sql`INSERT INTO semantic_index (content, embedding) VALUES ('test1', ${JSON.stringify(new Array(768).fill(0))}::vector)`

    const res = await app.request('/api/semantic-index', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    // biome-ignore lint/suspicious/noExplicitAny: test body
    const body = (await res.json()) as any
    expect(body.data).toBeInstanceOf(Array)
    expect(body.meta).toBeDefined()
    expect(body.meta.page).toBe(1)
  })

  it('POST /api/semantic-index > should create entry with embedding', async () => {
    const res = await app.request('/api/semantic-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: 'new content' }),
    })
    expect(res.status).toBe(201)
    // biome-ignore lint/suspicious/noExplicitAny: test body
    const body = (await res.json()) as any
    expect(body.data.content).toBe('new content')
    expect(body.data.embedding).toBeUndefined()
  })

  it('DELETE /api/semantic-index/:id > should delete entry', async () => {
    const postRes = await app.request('/api/semantic-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: 'to delete' }),
    })
    // biome-ignore lint/suspicious/noExplicitAny: test body
    const entry = ((await postRes.json()) as any).data

    const res = await app.request(`/api/semantic-index/${entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)

    const getRes = await app.request(`/api/semantic-index/${entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(getRes.status).toBe(404)
  })
})
