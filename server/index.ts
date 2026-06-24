import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { corsMiddleware } from './middleware/cors'
import {
  authRateLimiter,
  chatRateLimiter,
  generalRateLimiter,
  searchRateLimiter,
} from './middleware/rate-limit'
import articlesRoute from './routes/articles'
import authRoute from './routes/auth'
import { chatRoute } from './routes/chat'
import healthRoute from './routes/health'
import searchRoute from './routes/search'
import semanticIndex from './routes/semantic-index'
import tagsRoute from './routes/tags'
import { ValidationError } from './utils/validate'

const app = new Hono()

// Global Middleware
app.use('*', corsMiddleware)

// Error Handling Middleware
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ data: null, error: err.message }, 400)
  }

  console.error('Unhandled error:', err)
  return c.json(
    {
      data: null,
      error: err.message || 'Internal Server Error',
    },
    500,
  )
})

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      data: null,
      error: 'Not Found',
    },
    404,
  )
})

// Mount routes
app.route('/api/health', healthRoute)

// Apply category-specific rate limits before mounting routes
app.use('/api/auth/*', authRateLimiter)
app.use('/api/chat/*', chatRateLimiter)
app.use('/api/search/*', searchRateLimiter)

// Apply general rate limit to other routes
app.use('/api/articles/*', generalRateLimiter)
app.use('/api/tags/*', generalRateLimiter)
app.use('/api/semantic-index/*', generalRateLimiter)

app.route('/api/auth', authRoute)
app.route('/api/articles', articlesRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/search', searchRoute)
app.route('/api/semantic-index', semanticIndex)
app.route('/api/chat', chatRoute)

// Static file serving and SPA fallback for production
if (
  process.env.NODE_ENV === 'production' ||
  process.env.BUN_ENV === 'production'
) {
  app.use('/*', serveStatic({ root: './client/dist' }))

  // SPA fallback
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith('/api/')) {
      return next()
    }
    const html = await Bun.file('./client/dist/index.html').text()
    return c.html(html)
  })
}

const port = Number(process.env.PORT || process.env.SERVER_PORT) || 3000

export { app }

export default {
  port,
  fetch: app.fetch,
}
