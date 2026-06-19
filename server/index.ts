import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import authRoute from './routes/auth'
import healthRoute from './routes/health'

const app = new Hono()

// Global Middleware
app.use('*', corsMiddleware)

// Error Handling Middleware
app.onError((err, c) => {
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

const port = Number(process.env.SERVER_PORT) || 3000

if (import.meta.main) {
  console.log(`Server running on port ${port}`)
  Bun.serve({
    port,
    fetch: app.fetch,
  })
}

export default app
