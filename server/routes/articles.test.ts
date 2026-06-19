import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { signToken } from '../services/auth'
import articlesRoute from './articles'

const app = new Hono()
app.use('*', async (_c, next) => {
  // simple mock for auth middleware in tests if needed, or we just let it use real authMiddleware since we can sign tokens
  await next()
})
app.route('/api/articles', articlesRoute)

// Mock SQL queries
mock.module('../db/connection', () => {
  let articlesDb = [
    {
      id: 1,
      title: 'Test 1',
      slug: 'test-1',
      content: 'content 1',
      excerpt: 'ex 1',
      is_published: true,
      view_count: 0,
      author_id: 1,
    },
  ]

  return {
    // biome-ignore lint/suspicious/noExplicitAny: mock
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mock
    sql: mock(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?')
      if (query.includes('COUNT(*)')) {
        return [{ total: articlesDb.length }]
      }
      if (query.includes('SELECT a.*, u.username as author_username')) {
        if (query.includes('WHERE a.slug = ?')) {
          const found = articlesDb.filter((a) => a.slug === values[0])
          return found.length
            ? [{ ...found[0], author_username: 'testuser' }]
            : []
        }
        return articlesDb.map((a) => ({ ...a, author_username: 'testuser' }))
      }
      if (query.includes('article_tags at')) {
        return [] // mock tags empty
      }
      if (query.includes('SELECT 1 FROM articles WHERE slug = ?')) {
        const found = articlesDb.filter((a) => a.slug === values[0])
        return found
      }
      if (query.includes('INSERT INTO articles')) {
        const newArt = {
          id: 2,
          title: values[0],
          slug: values[1],
          content: values[2],
          excerpt: values[3],
          author_id: values[4],
          is_published: values[5],
          view_count: 0,
        }
        articlesDb.push(newArt)
        return [newArt]
      }
      if (query.includes('UPDATE articles\n    SET title = ?')) {
        const id = values[values.length - 1]
        const idx = articlesDb.findIndex((a) => a.id === id)
        if (idx !== -1) {
          articlesDb[idx] = {
            ...articlesDb[idx],
            title: values[0],
            slug: values[1],
            content: values[2],
            excerpt: values[3],
            is_published: values[4],
          }
          return [articlesDb[idx]]
        }
        return []
      }
      if (
        query.includes(
          'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
        )
      ) {
        const idx = articlesDb.findIndex((a) => a.id === values[0])
        if (idx !== -1) articlesDb[idx].view_count += 1
        return []
      }
      if (query.includes('SELECT * FROM articles WHERE id = ?')) {
        const found = articlesDb.filter((a) => a.id === values[0])
        return found
      }
      if (query.includes('DELETE FROM articles WHERE id = ?')) {
        articlesDb = articlesDb.filter((a) => a.id !== values[0])
        return []
      }
      return []
    }),
  }
})

describe('Article Routes', () => {
  describe('GET /api/articles', () => {
    it('should return paginated articles', async () => {
      const res = await app.fetch(new Request('http://localhost/api/articles'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.meta.total).toBeDefined()
    })
  })

  describe('GET /api/articles/:slug', () => {
    it('should return article by slug and increment view_count', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/articles/test-1'),
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.slug).toBe('test-1')
    })

    it('should return 404 for missing article', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/articles/non-existent'),
      )
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/articles', () => {
    it('should require auth', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'T', content: 'C' }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(401)
    })

    it('should create article with auth', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'New Article', content: 'New Content' }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.data.title).toBe('New Article')
      expect(data.data.slug).toBe('new-article')
    })
  })

  describe('PUT /api/articles/:id', () => {
    it('should update article', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const req = new Request('http://localhost/api/articles/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.title).toBe('Updated Title')
      expect(data.data.slug).toBe('updated-title')
    })
  })

  describe('DELETE /api/articles/:id', () => {
    it('should delete article', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const req = new Request('http://localhost/api/articles/1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })
  })
})
