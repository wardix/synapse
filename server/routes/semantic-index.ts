import { Hono } from 'hono'
import type {
  CreateSemanticIndexRequest,
  SemanticIndexEntry,
} from '../../shared/types'
import { sql } from '../db/connection'
import { generateEmbedding } from '../services/embedding'
import {
  validateArray,
  validatePagination,
  validateString,
} from '../utils/validate'

const semanticIndex = new Hono()

semanticIndex.use('*', authMiddleware)

semanticIndex.get('/', async (c) => {
  const { page, limit, offset } = validatePagination(
    c.req.query('page'),
    c.req.query('limit'),
  )

  const entries = await sql<SemanticIndexEntry[]>`
    SELECT 
      si.id, 
      si.content, 
      si.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', a.id,
            'title', a.title,
            'slug', a.slug
          )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) as linked_articles
    FROM semantic_index si
    LEFT JOIN article_semantic_index asi ON si.id = asi.semantic_index_id
    LEFT JOIN articles a ON asi.article_id = a.id
    GROUP BY si.id
    ORDER BY si.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [{ count }] = await sql<{ count: string }[]>`
    SELECT COUNT(*) FROM semantic_index
  `

  return c.json({
    data: entries,
    meta: {
      page,
      limit,
      total: Number(count),
    },
  })
})

semanticIndex.post('/', async (c) => {
  const body = await c.req.json<CreateSemanticIndexRequest>()
  if (!body.content) {
    return c.json({ data: null, error: 'Content is required' }, 400)
  }
  const content = validateString(body.content, {
    minLength: 1,
    maxLength: 10000,
    fieldName: 'content',
  })
  const article_ids = body.article_ids
    ? validateArray(body.article_ids, { fieldName: 'article_ids' })
    : undefined

  const embedding = await generateEmbedding(content)

  const [entry] = await sql<SemanticIndexEntry[]>`
    INSERT INTO semantic_index (content, embedding)
    VALUES (${content}, ${JSON.stringify(embedding)}::vector)
    RETURNING id, content, created_at
  `

  if (article_ids && article_ids.length > 0) {
    for (const articleId of article_ids) {
      await sql`
        INSERT INTO article_semantic_index (article_id, semantic_index_id)
        VALUES (${articleId}, ${entry.id})
        ON CONFLICT DO NOTHING
      `
    }
  }

  return c.json({ data: entry }, 201)
})

semanticIndex.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await sql`
    DELETE FROM semantic_index
    WHERE id = ${id}
  `

  if (result.count === 0) {
    return c.json({ data: null, error: 'Entry not found' }, 404)
  }

  return c.json({ data: { message: 'Entry deleted' } })
})

export default semanticIndex
