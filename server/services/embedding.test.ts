import { afterAll, describe, expect, it, mock } from 'bun:test'
import { generateEmbedding } from './embedding'

describe('Embedding Service', () => {
  const originalFetch = global.fetch
  const originalEnv = process.env.GEMINI_API_KEY

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalEnv
    global.fetch = originalFetch
  })

  it('should return a 768-dim vector on success', async () => {
    process.env.GEMINI_API_KEY = 'valid-key'
    global.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          embedding: {
            values: new Array(768).fill(0.1),
          },
        }),
        { status: 200 },
      )
    })

    const result = await generateEmbedding('test')
    expect(result.length).toBe(768)
    expect(result[0]).toBe(0.1)
  })

  it('should handle rate limit gracefully', async () => {
    process.env.GEMINI_API_KEY = 'valid-key'
    global.fetch = mock(async () => {
      return new Response('Too Many Requests', { status: 429 })
    })

    await expect(generateEmbedding('test')).rejects.toThrow(
      'Rate limit exceeded for Gemini API',
    )
  })

  it('should handle invalid api key gracefully', async () => {
    process.env.GEMINI_API_KEY = 'invalid-key'
    global.fetch = mock(async () => {
      return new Response('Unauthorized', { status: 401 })
    })

    await expect(generateEmbedding('test')).rejects.toThrow(
      'Invalid Gemini API Key',
    )
  })

  it('should handle missing GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY
    await expect(generateEmbedding('test')).rejects.toThrow(
      'GEMINI_API_KEY is not configured',
    )
  })
})
