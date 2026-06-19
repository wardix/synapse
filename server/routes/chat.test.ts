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
  sql: mock(async (strings: TemplateStringsArray) => {
    if (strings.join('').includes('INSERT INTO chat_messages')) {
      return [{ id: 100 }]
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
})
