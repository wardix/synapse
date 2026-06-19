import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
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
app.route('/api/auth', authRoute)
app.route('/api/articles', articlesRoute)
app.route('/api/tags', tagsRoute)
app.route('/api/search', searchRoute)
app.route('/api/semantic-index', semanticIndex)
app.route('/api/chat', chatRoute)

const port = Number(process.env.SERVER_PORT) || 3000

if (import.meta.main) {
  console.log(`Server running on port ${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}

export default app
