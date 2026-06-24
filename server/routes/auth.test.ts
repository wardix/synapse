import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { hashPassword, signToken } from '../services/auth'
import authRoute from './auth'

const app = new Hono()
app.route('/api/auth', authRoute)

// Mock SQL queries
mock.module('../db/connection', () => {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: mock
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mock
    sql: mock(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?')
      if (query.includes('FROM users WHERE email = ? OR username = ?')) {
        const [email, username] = values
        if (email === 'taken@example.com')
          return [{ id: 1, email: 'taken@example.com', username: 'taken' }]
        if (username === 'takenuser')
          return [{ id: 1, email: 'other@example.com', username: 'takenuser' }]
        return []
      }
      if (query.includes('INSERT INTO users')) {
        return [
          {
            id: 2,
            username: values[0],
            email: values[1],
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      }
      if (query.includes('FROM users\n    WHERE email = ?')) {
        const email = values[0]
        if (email === 'user@example.com') {
          // pre-computed hash for 'password123' to avoid async mocking issues
          return [
            {
              id: 1,
              username: 'testuser',
              email: 'user@example.com',
              password: await hashPassword('password123'),
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        }
        return []
      }
      if (query.includes('FROM users\n    WHERE id = ?')) {
        const id = values[0]
        if (id === 1) {
          return [
            {
              id: 1,
              username: 'testuser',
              email: 'user@example.com',
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        }
        return []
      }
      return []
    }),
  }
})

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const req = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.data.user.username).toBe('newuser')
      expect(data.data.token).toBeDefined()
    })

    it('should return 400 for duplicate email', async () => {
      const req = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser2',
          email: 'taken@example.com',
          password: 'password123',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Email already in use')
    })

    it('should return 400 for duplicate username', async () => {
      const req = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'takenuser',
          email: 'new2@example.com',
          password: 'password123',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Username already taken')
    })

    it('should return 400 for short password', async () => {
      const req = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          email: 'new@example.com',
          password: 'short',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.token).toBeDefined()
    })

    it('should fail with wrong password', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const req = new Request('http://localhost/api/auth/me')
      const res = await app.fetch(req)
      expect(res.status).toBe(401)
    })

    it('should return 401 with invalid token', async () => {
      const req = new Request('http://localhost/api/auth/me', {
        headers: { Authorization: 'Bearer invalid.token' },
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(401)
    })

    it('should return user with valid token', async () => {
      const token = await signToken({ userId: 1, email: 'user@example.com' })
      const req = new Request('http://localhost/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const res = await app.fetch(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.data.email).toBe('user@example.com')
    })
  })
})
