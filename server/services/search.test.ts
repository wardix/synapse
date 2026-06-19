import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { sql } from '../db/connection'
import { searchFTS, searchHybrid, searchSemantic } from './search'

describe('Search Service', () => {
  let article1Id: number
  let article2Id: number
  let tagId: number
  let semantic1Id: number

  beforeAll(async () => {
    // ensure test DB is clean of our specific test records if any left
    await sql`DELETE FROM articles WHERE slug LIKE 'search-test-%'`

    // Create a tag
    const [tag] = await sql`
      INSERT INTO tags (name, slug) VALUES ('Search Test', 'search-test')
      ON CONFLICT DO NOTHING
      RETURNING id
    `
    if (tag) {
      tagId = Number(tag.id)
    } else {
      const [t] = await sql`SELECT id FROM tags WHERE slug = 'search-test'`
      tagId = Number(t.id)
    }

    // Insert mock articles
    const [a1] = await sql`
      INSERT INTO articles (title, slug, content, excerpt, is_published)
      VALUES ('PostgreSQL full text search guide', 'search-test-1', 'This guide explains how to use tsvector and tsquery.', 'excerpt', true)
      RETURNING id
    `
    article1Id = Number(a1.id)

    const [a2] = await sql`
      INSERT INTO articles (title, slug, content, excerpt, is_published)
      VALUES ('NodeJS and Bun performance', 'search-test-2', 'Comparing NodeJS and Bun for backend development.', 'excerpt', true)
      RETURNING id
    `
    article2Id = Number(a2.id)

    // Tag the first article
    await sql`INSERT INTO article_tags (article_id, tag_id) VALUES (${article1Id}, ${tagId})`

    // Insert semantic index (mock embedding)
    const [si1] = await sql`
      INSERT INTO semantic_index (content, embedding)
      VALUES ('PostgreSQL full text search', ${JSON.stringify(new Array(768).fill(0.1))}::vector)
      RETURNING id
    `
    semantic1Id = Number(si1.id)

    // Link semantic entry to article 1
    await sql`INSERT INTO article_semantic_index (article_id, semantic_index_id) VALUES (${article1Id}, ${semantic1Id})`

    // Mock embedding service for semantic search tests
    process.env.GEMINI_API_KEY = 'valid-key'
    global.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          embedding: { values: new Array(768).fill(0.1) },
        }),
        { status: 200 },
      )
    })
  })

  afterAll(async () => {
    await sql`DELETE FROM article_tags WHERE article_id IN (${article1Id}, ${article2Id})`
    await sql`DELETE FROM article_semantic_index WHERE article_id = ${article1Id}`
    await sql`DELETE FROM semantic_index WHERE id = ${semantic1Id}`
    await sql`DELETE FROM articles WHERE id IN (${article1Id}, ${article2Id})`
    await sql`DELETE FROM tags WHERE id = ${tagId}`
  })

  describe('searchFTS', () => {
    it('should find articles matching full text query', async () => {
      const results = await searchFTS('PostgreSQL guide')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].article.id).toBe(article1Id)
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should respect tag filters', async () => {
      const results = await searchFTS('PostgreSQL', { tag: 'search-test' })
      expect(results.length).toBeGreaterThan(0)

      const resultsEmpty = await searchFTS('PostgreSQL', {
        tag: 'non-existent-tag',
      })
      expect(resultsEmpty.length).toBe(0)
    })

    it('should return empty array for non-matching queries', async () => {
      const results = await searchFTS('xyznonexistentword')
      expect(results.length).toBe(0)
    })
  })

  describe('searchSemantic', () => {
    it('should find articles based on semantic similarity', async () => {
      const results = await searchSemantic('How to use Postgres full text')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].article.id).toBe(article1Id)
      expect(results[0].semantic_entry.id).toBe(semantic1Id)
      expect(results[0].score).toBeGreaterThan(0)
      expect(results[0].score).toBeLessThanOrEqual(1)
    })
  })

  describe('searchHybrid', () => {
    it('should combine and normalize FTS and semantic results', async () => {
      const results = await searchHybrid('PostgreSQL guide')
      expect(results.length).toBeGreaterThan(0)

      const a1Match = results.find((r) => r.article.id === article1Id)
      expect(a1Match).toBeDefined()
      expect(a1Match?.fts_score).toBeDefined()
      expect(a1Match?.semantic_score).toBeDefined()
      expect(a1Match?.combined_score).toBeGreaterThan(0)
    })
  })
})
