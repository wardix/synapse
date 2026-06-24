import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { sql } from '../db/connection'
import { signToken } from '../services/auth'
import articlesRoute from './articles'
import authRoute from './auth'

const app = new Hono()
app.use('*', async (_c, next) => {
  // let auth middleware run normally, we provide valid tokens
  await next()
})
app.route('/api/auth', authRoute)
app.route('/api/articles', articlesRoute)

describe('Article Routes', () => {
  let token: string
  let authorId: number
  let articleId: number
  let _articleSlug: string

  const originalFetch = global.fetch

  beforeAll(async () => {
    const rand = Math.random().toString(36).substring(7)
    let uid = 1
    try {
      const users = await sql`
        INSERT INTO users (username, email, password)
        VALUES (${`article_${rand}`}, ${`article_${rand}@test.com`}, 'hash')
        RETURNING id
      `
      if (users && users.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: record
        uid = (users[0] as any).id
      }
    } catch (_e) {
      // ignore
    }
    authorId = uid
    token = await signToken({
      userId: authorId,
      email: `article_${rand}@test.com`,
    })

    // Ensure tags exist for tests
    await sql`
      INSERT INTO tags (name, slug, color) VALUES ('React', 'react', '#61dafb') ON CONFLICT DO NOTHING
    `
    await sql`
      INSERT INTO tags (name, slug, color) VALUES ('TypeScript', 'typescript', '#3178c6') ON CONFLICT DO NOTHING
    `
  })

  afterAll(async () => {
    await sql`DELETE FROM users WHERE id = ${authorId}`
    global.fetch = originalFetch
  })

  describe('GET /api/articles', () => {
    it('should return paginated articles', async () => {
      const req = new Request('http://localhost/api/articles?page=1&limit=10')
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      // biome-ignore lint/suspicious/noExplicitAny: any
      const body = (await res.json()) as any
      expect(body.data).toBeInstanceOf(Array)
      expect(body.meta).toBeDefined()
    })
  })

  describe('GET /api/articles/:slug', () => {
    it('should return article by slug and increment view_count', async () => {
      const [inserted] = await sql`
        INSERT INTO articles (title, slug, content, author_id)
        VALUES ('Test View', 'test-view', 'Content', ${authorId})
        RETURNING *
      `
      // biome-ignore lint/suspicious/noExplicitAny: any
      const a = inserted as any

      const req = new Request(`http://localhost/api/articles/${a.slug}`)
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      // biome-ignore lint/suspicious/noExplicitAny: any
      const body = (await res.json()) as any
      expect(body.data.view_count).toBe(a.view_count + 1)
      expect(body.data.author.id).toBe(authorId)

      await sql`DELETE FROM articles WHERE id = ${a.id}`
    })

    it('should return 404 for missing article', async () => {
      const req = new Request('http://localhost/api/articles/does-not-exist')
      const res = await app.fetch(req)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/articles', () => {
    it('should create article with auth', async () => {
      process.env.GEMINI_API_KEY = 'valid-key'
      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            embedding: { values: new Array(768).fill(0.1) },
          }),
          { status: 200 },
        )
      })

      const reqAuth = new Request('http://localhost/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'New Article', content: 'New Content' }),
      })
      const res = await app.fetch(reqAuth)
      expect(res.status).toBe(201)
      // biome-ignore lint/suspicious/noExplicitAny: any
      const data = (await res.json()) as any
      expect(data.data.title).toBe('New Article')

      articleId = data.data.id
      _articleSlug = data.data.slug

      global.fetch = originalFetch
    })
  })

  describe('PUT /api/articles/:id', () => {
    it('should update article', async () => {
      process.env.GEMINI_API_KEY = 'valid-key'
      global.fetch = mock(async () => {
        return new Response(
          JSON.stringify({
            embedding: { values: new Array(768).fill(0.1) },
          }),
          { status: 200 },
        )
      })

      const req = new Request(`http://localhost/api/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      // biome-ignore lint/suspicious/noExplicitAny: any
      const body = (await res.json()) as any
      expect(body.data.title).toBe('Updated Title')

      global.fetch = originalFetch
    })
  })

  describe('DELETE /api/articles/:id', () => {
    it('should delete article', async () => {
      const req = new Request(`http://localhost/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)

      const check = await sql`SELECT * FROM articles WHERE id = ${articleId}`
      expect(check.length).toBe(0)
    })
  })
})
