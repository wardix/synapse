import type {
  FTSResult,
  HybridResult,
  SearchFilters,
  SemanticResult,
} from '../../shared/types'
import { sql } from '../db/connection'
import { generateEmbedding } from './embedding'

export async function searchFTS(
  query: string,
  filters?: SearchFilters,
): Promise<FTSResult[]> {
  const limit = filters?.limit || 20
  const tagSlug = filters?.tag || null
  const authorId = filters?.author_id || null

  const rows = await sql`
    WITH filtered_articles AS (
      SELECT a.*, ts_rank(to_tsvector('english', a.title || ' ' || a.content), plainto_tsquery('english', ${query})) AS fts_rank
      FROM articles a
      WHERE to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery('english', ${query})
        AND a.is_published = true
        AND (${authorId}::int IS NULL OR a.author_id = ${authorId}::int)
        AND (${tagSlug}::text IS NULL OR EXISTS (
          SELECT 1 FROM article_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE at.article_id = a.id AND t.slug = ${tagSlug}::text
        ))
    )
    SELECT a.*, u.username as author_username
    FROM filtered_articles a
    LEFT JOIN users u ON a.author_id = u.id
    ORDER BY a.fts_rank DESC
    LIMIT ${limit}
  `

  if (rows.length === 0) return []

  // Fetch tags
  // biome-ignore lint/suspicious/noExplicitAny: record type
  const articleIds = rows.map((r: any) => r.id)
  const tags = await sql`
    SELECT at.article_id, t.*
    FROM article_tags at
    JOIN tags t ON at.tag_id = t.id
    WHERE at.article_id = ANY(${articleIds}::int[])
  `

  // biome-ignore lint/suspicious/noExplicitAny: record type
  return rows.map((r: any) => ({
    article: {
      id: r.id,
      title: r.title,
      slug: r.slug,
      content: r.content,
      excerpt: r.excerpt,
      author: r.author_id
        ? { id: r.author_id, username: r.author_username }
        : null,
      tags: tags
        .filter((t) => t.article_id === r.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          color: t.color,
          created_at: t.created_at,
        })),
      is_published: r.is_published,
      view_count: r.view_count,
      created_at: r.created_at,
      updated_at: r.updated_at,
    },
    score: Number(r.fts_rank),
  }))
}

export async function searchSemantic(
  query: string,
  filters?: SearchFilters,
): Promise<SemanticResult[]> {
  const limit = filters?.limit || 20
  const tagSlug = filters?.tag || null
  const authorId = filters?.author_id || null

  const embedding = await generateEmbedding(query)
  const embeddingString = JSON.stringify(embedding)

  const rows = await sql`
    WITH semantic_matches AS (
      SELECT si.id as semantic_id, si.content as semantic_content, si.created_at as semantic_created_at, 
             1 - (si.embedding <=> ${embeddingString}::vector) AS similarity,
             asi.article_id
      FROM semantic_index si
      JOIN article_semantic_index asi ON si.id = asi.semantic_index_id
      ORDER BY si.embedding <=> ${embeddingString}::vector
      LIMIT ${limit * 2}
    ),
    filtered_matches AS (
      SELECT sm.*, a.id as article_id_actual, a.title, a.slug, a.content, a.excerpt, a.is_published, a.view_count, a.created_at, a.updated_at, a.author_id, u.username as author_username,
             ROW_NUMBER() OVER(PARTITION BY a.id ORDER BY sm.similarity DESC) as rn
      FROM semantic_matches sm
      JOIN articles a ON sm.article_id = a.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_published = true
        AND (${authorId}::int IS NULL OR a.author_id = ${authorId}::int)
        AND (${tagSlug}::text IS NULL OR EXISTS (
          SELECT 1 FROM article_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE at.article_id = a.id AND t.slug = ${tagSlug}::text
        ))
    )
    SELECT * FROM filtered_matches
    WHERE rn = 1
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  if (rows.length === 0) return []

  // Fetch tags
  // biome-ignore lint/suspicious/noExplicitAny: record type
  const articleIds = rows.map((r: any) => r.article_id_actual)
  const tags = await sql`
    SELECT at.article_id, t.*
    FROM article_tags at
    JOIN tags t ON at.tag_id = t.id
    WHERE at.article_id = ANY(${articleIds}::int[])
  `

  // biome-ignore lint/suspicious/noExplicitAny: record type
  return rows.map((r: any) => ({
    article: {
      id: r.article_id_actual,
      title: r.title,
      slug: r.slug,
      content: r.content,
      excerpt: r.excerpt,
      author: r.author_id
        ? { id: r.author_id, username: r.author_username }
        : null,
      tags: tags
        .filter((t) => t.article_id === r.article_id_actual)
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          color: t.color,
          created_at: t.created_at,
        })),
      is_published: r.is_published,
      view_count: r.view_count,
      created_at: r.created_at,
      updated_at: r.updated_at,
    },
    semantic_entry: {
      id: r.semantic_id,
      content: r.semantic_content,
      created_at: r.semantic_created_at,
    },
    score: Number(r.similarity),
  }))
}

export async function searchHybrid(
  query: string,
  filters?: SearchFilters,
): Promise<HybridResult[]> {
  const [ftsResults, semanticResults] = await Promise.all([
    searchFTS(query, filters),
    searchSemantic(query, filters),
  ])

  const articleMap = new Map<number, HybridResult>()

  let maxFtsScore = 0
  for (const r of ftsResults) {
    if (r.score > maxFtsScore) maxFtsScore = r.score
  }

  for (const r of ftsResults) {
    const normalizedFts = maxFtsScore > 0 ? r.score / maxFtsScore : 0
    articleMap.set(r.article.id, {
      article: r.article,
      fts_score: r.score,
      combined_score: 0.4 * normalizedFts,
    })
  }

  for (const r of semanticResults) {
    const existing = articleMap.get(r.article.id)
    if (existing) {
      existing.semantic_entry = r.semantic_entry
      existing.semantic_score = r.score
      // normalized fts + semantic score
      const normalizedFts =
        maxFtsScore > 0 && existing.fts_score
          ? existing.fts_score / maxFtsScore
          : 0
      existing.combined_score = 0.4 * normalizedFts + 0.6 * r.score
    } else {
      articleMap.set(r.article.id, {
        article: r.article,
        semantic_entry: r.semantic_entry,
        semantic_score: r.score,
        combined_score: 0.6 * r.score,
      })
    }
  }

  const limit = filters?.limit || 20
  const combined = Array.from(articleMap.values())
  combined.sort((a, b) => b.combined_score - a.combined_score)

  return combined.slice(0, limit)
}
