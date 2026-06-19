import { afterEach, describe, expect, it, mock } from 'bun:test'
import { generateStreamingResponse } from './gemini'

// Mock global fetch
const originalFetch = global.fetch

describe('Gemini Service', () => {
  afterEach(() => {
    global.fetch = originalFetch
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('should stream chunks correctly', async () => {
    process.env.GEMINI_API_KEY = 'test-key'

    // Create a fake readable stream mimicking SSE response
    const chunks = [
      'data: {"candidates": [{"content": {"parts": [{"text": "Hello "}]}}]}\n\n',
      'data: {"candidates": [{"content": {"parts": [{"text": "world!"}]}}]}\n\n',
    ]

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk))
        }
        controller.close()
      },
    })

    global.fetch = mock(async () => {
      return new Response(stream, { status: 200 })
    })

    const generator = generateStreamingResponse('Say hi')
    let result = ''
    for await (const chunk of generator) {
      result += chunk
    }

    expect(result).toBe('Hello world!')
  })

  it('should handle API errors gracefully', async () => {
    process.env.GEMINI_API_KEY = 'test-key'

    global.fetch = mock(async () => {
      return new Response('API error message', { status: 400 })
    })

    const generator = generateStreamingResponse('Say hi')
    try {
      for await (const _ of generator) {
      }
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      expect((e as Error).message).toContain('API error message')
      expect((e as Error).message).toContain('400')
    }
  })

  it('should throw if GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY

    const generator = generateStreamingResponse('Say hi')
    try {
      for await (const _ of generator) {
      }
      expect(true).toBe(false) // Should not reach here
    } catch (e) {
      expect((e as Error).message).toBe('GEMINI_API_KEY is not configured')
    }
  })
})
