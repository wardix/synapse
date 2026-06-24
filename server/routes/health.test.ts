import { describe, expect, it } from 'bun:test'
import { app } from '../index'

// Register before any fetch calls
app.get('/api/test-error', () => {
  throw new Error('Test error message')
})

describe('Health Route & App Setup', () => {
  it('GET /api/health should return 200 with status: ok', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual({
      data: { status: 'ok' },
    })
  })

  it('Unknown routes should return 404', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/unknown-route'),
    )
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json).toEqual({
      data: null,
      error: 'Not Found',
    })
  })

  it('Error handling middleware should catch errors', async () => {
    const res = await app.fetch(new Request('http://localhost/api/test-error'))
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json).toEqual({
      data: null,
      error: 'Test error message',
    })
  })
})
