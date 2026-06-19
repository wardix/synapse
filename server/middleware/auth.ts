import type { Context, Next } from 'hono'
import { type AuthJWTPayload, verifyToken } from '../services/auth'

export type AuthVariables = {
  user: AuthJWTPayload
}

export const authMiddleware = async (
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ data: null, error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return c.json({ data: null, error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await verifyToken(token)
    c.set('user', payload)
    await next()
  } catch (_error) {
    return c.json({ data: null, error: 'Unauthorized' }, 401)
  }
}
