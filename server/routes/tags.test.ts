import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { signToken } from '../services/auth'
import tagsRoute from './tags'

const app = new Hono()
app.use('*', async (_c, next) => {
  await next()
})
app.route('/api/tags', tagsRoute)

mock.module('../db/connection', () => {
  let tagsDb = [{ id: 1, name: 'Test', slug: 'test', color: '#000000' }]

  return {
    // biome-ignore lint/suspicious/noExplicitAny: mock
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mock
    sql: mock(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?')
      if (query.includes('SELECT * FROM tags ORDER BY name ASC')) {
        return tagsDb
      }
      if (query.includes('SELECT 1 FROM tags WHERE name = ? AND id != ?')) {
        return tagsDb.filter((t) => t.name === values[0] && t.id !== values[1])
      }
      if (query.includes('SELECT 1 FROM tags WHERE name = ?')) {
        return tagsDb.filter((t) => t.name === values[0])
      }
      if (query.includes('SELECT 1 FROM tags WHERE slug = ?')) {
        return tagsDb.filter((t) => t.slug === values[0])
      }
      if (query.includes('INSERT INTO tags')) {
        const newTag = {
          id: 2,
          name: values[0],
          slug: values[1],
          color: values[2],
        }
        tagsDb.push(newTag)
        return [newTag]
      }
      if (query.includes('SELECT * FROM tags WHERE id = ?')) {
        return tagsDb.filter((t) => t.id === values[0])
      }
      if (query.includes('UPDATE tags\n    SET name = ?')) {
        const id = values[values.length - 1]
        const idx = tagsDb.findIndex((t) => t.id === id)
        if (idx !== -1) {
          tagsDb[idx] = {
            ...tagsDb[idx],
            name: values[0],
            slug: values[1],
            color: values[2],
          }
          return [tagsDb[idx]]
        }
        return []
      }
      if (query.includes('DELETE FROM tags WHERE id = ?')) {
        tagsDb = tagsDb.filter((t) => t.id !== values[0])
        return []
      }
      return []
    }),
  }
})

describe('Tag Routes', () => {
  describe('GET /api/tags', () => {
    it('should return all tags', async () => {
      const res = await app.fetch(new Request('http://localhost/api/tags'))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/tags', () => {
    it('should create a tag', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const res = await app.fetch(
        new Request('http://localhost/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: 'New Tag' }),
        }),
      )
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.data.name).toBe('New Tag')
      expect(data.data.slug).toBe('new-tag')
      expect(data.data.color).toBe('#6366f1')
    })

    it('should validate duplicate name', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const res = await app.fetch(
        new Request('http://localhost/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: 'Test' }),
        }),
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/tags/:id', () => {
    it('should update a tag', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const res = await app.fetch(
        new Request('http://localhost/api/tags/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: 'Updated', color: '#ff0000' }),
        }),
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.name).toBe('Updated')
      expect(data.data.color).toBe('#ff0000')
    })
  })

  describe('DELETE /api/tags/:id', () => {
    it('should delete a tag', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const res = await app.fetch(
        new Request('http://localhost/api/tags/1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      )
      expect(res.status).toBe(200)
    })
  })
})
