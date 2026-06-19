import { Hono } from 'hono'
import type { LoginRequest, RegisterRequest, User } from '../../shared/types'
import { sql } from '../db/connection'
import { type AuthVariables, authMiddleware } from '../middleware/auth'
import { hashPassword, signToken, verifyPassword } from '../services/auth'
import { validateString } from '../utils/validate'

const authRoute = new Hono<{ Variables: AuthVariables }>()

authRoute.post('/register', async (c) => {
  const body = await c.req.json<RegisterRequest>()
  if (!body.username || !body.email || !body.password) {
    return c.json({ data: null, error: 'All fields are required' }, 400)
  }

  const email = validateString(body.email, {
    maxLength: 255,
    fieldName: 'email',
  })
  const username = validateString(body.username, {
    minLength: 3,
    maxLength: 50,
    fieldName: 'username',
  })
  const password = validateString(body.password, {
    minLength: 8,
    maxLength: 255,
    fieldName: 'password',
  })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return c.json({ data: null, error: 'Invalid email format' }, 400)
  }

  const existingUser = await sql`
    SELECT id, email, username FROM users WHERE email = ${email} OR username = ${username}
  `
  if (existingUser.length > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: pg record
    const isEmailTaken = existingUser.some((u: any) => u.email === email)
    return c.json(
      {
        data: null,
        error: isEmailTaken ? 'Email already in use' : 'Username already taken',
      },
      400,
    )
  }

  const hashedPassword = await hashPassword(password)

  const inserted = await sql`
    INSERT INTO users (username, email, password_hash)
    VALUES (${username}, ${email}, ${hashedPassword})
    RETURNING id, username, email, avatar_url, created_at, updated_at
  `

  const user = inserted[0] as User
  const token = await signToken({ userId: user.id, email: user.email })

  return c.json({ data: { user, token } }, 201)
})

authRoute.post('/login', async (c) => {
  const body = await c.req.json<LoginRequest>()
  if (!body.email || !body.password) {
    return c.json({ data: null, error: 'Email and password are required' }, 400)
  }

  const email = validateString(body.email, {
    maxLength: 255,
    fieldName: 'email',
  })
  const password = validateString(body.password, {
    maxLength: 255,
    fieldName: 'password',
  })

  const users = await sql`
    SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
    FROM users
    WHERE email = ${email}
  `

  if (users.length === 0) {
    return c.json({ data: null, error: 'Invalid credentials' }, 401)
  }

  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const userRecord = users[0] as any
  const isValid = await verifyPassword(password, userRecord.password_hash)

  if (!isValid) {
    return c.json({ data: null, error: 'Invalid credentials' }, 401)
  }

  const user: User = {
    id: userRecord.id,
    username: userRecord.username,
    email: userRecord.email,
    avatar_url: userRecord.avatar_url,
    created_at: userRecord.created_at,
    updated_at: userRecord.updated_at,
  }

  const token = await signToken({ userId: user.id, email: user.email })

  return c.json({ data: { user, token } }, 200)
})

authRoute.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')
  const users = await sql`
    SELECT id, username, email, avatar_url, created_at, updated_at
    FROM users
    WHERE id = ${authUser.userId}
  `

  if (users.length === 0) {
    return c.json({ data: null, error: 'User not found' }, 404)
  }

  const user = users[0] as User
  return c.json({ data: user }, 200)
})

export default authRoute
