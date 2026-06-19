import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({
    data: { status: 'ok' },
  })
})

export default app
