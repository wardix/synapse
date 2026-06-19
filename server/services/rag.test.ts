import { describe, expect, it, mock } from 'bun:test'
import { askRag } from './rag'

// Mock dependencies
mock.module('./embedding', () => ({
  generateEmbedding: mock(async () => new Array(768).fill(0.1)),
}))

mock.module('./gemini', () => ({
  generateStreamingResponse: async function* () {
    yield 'Streamed '
    yield 'response'
  },
}))

mock.module('../db/connection', () => ({
  sql: mock(async () => {
    return [
      {
        id: 1,
        content: 'Test content',
        similarity: 0.95,
        article_id: 10,
        article_title: 'Test Article',
        article_slug: 'test-article',
        article_excerpt: 'Excerpt',
      },
    ]
  }),
}))

describe('RAG Pipeline', () => {
  it('should embed question, retrieve entries, and return a stream', async () => {
    const { stream, retrievals } = await askRag('Test question')

    expect(retrievals.length).toBe(1)
    expect(retrievals[0].content).toBe('Test content')

    let answer = ''
    for await (const chunk of stream) {
      answer += chunk
    }

    expect(answer).toBe('Streamed response')
  })
})
