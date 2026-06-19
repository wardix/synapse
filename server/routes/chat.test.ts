import { beforeAll, describe, expect, it, mock } from 'bun:test'
import * as jose from 'jose'
import app from '../index'

mock.module('../services/rag', () => ({
  askRag: mock(async () => {
    return {
      stream: (async function* () {
        yield 'Chunk 1'
        yield 'Chunk 2'
      })(),
      retrievals: [{ id: 1, similarity: 0.9 }],
    }
  }),
}))

mock.module('../db/connection', () => ({
  // biome-ignore lint/suspicious/noExplicitAny: mock
  sql: mock(async (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.join(' ')
    if (query.includes('INSERT INTO chat_messages')) {
      return [{ id: 100 }]
    }
    if (query.includes('SELECT COUNT(*) as total')) {
      return [{ total: 1 }]
    }
    if (query.includes('ORDER BY created_at DESC')) {
      return [
        {
          id: 1,
          question: 'Hello',
          answer: `${'a'.repeat(200)}...`,
          created_at: '2023-01-01T00:00:00.000Z',
        },
      ]
    }
    if (
      query.includes('WHERE id = $1 AND user_id = $2') ||
      (query.includes('WHERE id = ') && query.includes('user_id = '))
    ) {
      // simulate parameter injection
      const chatIdParam = values[0]
      if (chatIdParam === 999) return []
      return [
        {
          id: 100,
          question: 'Test Q',
          answer: 'Test A',
          created_at: '2023-01-01',
        },
      ]
    }
    if (query.includes('FROM chat_retrievals cr')) {
      return [
        {
          semantic_index_id: 1,
          content: 'Text',
          similarity_score: 0.9,
          article_id: null,
          article_title: null,
          article_slug: null,
        },
      ]
    }
    return []
  }),
}))

describe('Chat Route', () => {
  let token: string

  beforeAll(async () => {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default-dev-secret-key-please-change',
    )
    token = await new jose.SignJWT({ userId: 1, email: 'test@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)
  })

  it('should return 401 without token', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Hello' }),
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 if question is missing', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(400)
  })

  it('should stream response successfully', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question: 'Hello RAG' }),
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const bodyText = await res.text()
    expect(bodyText).toContain('data: {"chunk":"Chunk 1"}')
    expect(bodyText).toContain('data: {"chunk":"Chunk 2"}')
    expect(bodyText).toContain('data: [DONE]')
  })

  it('should return chat history paginated', async () => {
    const req = new Request(
      'http://localhost/api/chat/history?page=1&limit=20',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      meta: { total: number }
      data: { answer: string }[]
    }
    expect(body.meta.total).toBe(1)
    expect(body.data.length).toBe(1)
    expect(body.data[0].answer).toContain('...')
  })

  it('should return chat detail with retrievals', async () => {
    const req = new Request('http://localhost/api/chat/100', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { id: number; retrievals: unknown[] }
    }
    expect(body.data.id).toBe(100)
    expect(body.data.retrievals.length).toBe(1)
  })

  it('should return 404 for missing chat detail', async () => {
    const req = new Request('http://localhost/api/chat/999', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const res = await app.fetch(req)
    expect(res.status).toBe(404)
  })
})
