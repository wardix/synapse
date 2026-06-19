import { cors } from 'hono/cors'

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

export const corsMiddleware = cors({
  origin: clientUrl,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
})
