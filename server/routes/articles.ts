import { Hono } from 'hono'
import type {
  Article,
  CreateArticleRequest,
  UpdateArticleRequest,
} from '../../shared/types'
import { sql } from '../db/connection'
import { type AuthVariables, authMiddleware } from '../middleware/auth'
import { verifyToken } from '../services/auth'
import { generateSlug } from '../utils/slug'

const articlesRoute = new Hono<{ Variables: AuthVariables }>()

articlesRoute.get('/', async (c) => {
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20
  const tagSlug = c.req.query('tag') || null
  const authorId = c.req.query('author_id')
    ? Number(c.req.query('author_id'))
    : null
  const offset = (page - 1) * limit

  const authHeader = c.req.header('Authorization')
  let userId: number | null = null
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const payload = await verifyToken(token)
      userId = payload.userId
    } catch (_e) {
      // ignore
    }
  }

  const totalCountResult = await sql`
    SELECT COUNT(*) as total
    FROM articles a
    WHERE (${userId === null} OR a.is_published = true)
      AND (${authorId}::int IS NULL OR a.author_id = ${authorId}::int)
      AND (${tagSlug}::text IS NULL OR EXISTS (
        SELECT 1 FROM article_tags at 
        JOIN tags t ON at.tag_id = t.id 
        WHERE at.article_id = a.id AND t.slug = ${tagSlug}::text
      ))
  `
  const total = Number(totalCountResult[0].total)

  const articles = await sql`
    SELECT a.*, u.username as author_username
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE (${userId === null} OR a.is_published = true)
      AND (${authorId}::int IS NULL OR a.author_id = ${authorId}::int)
      AND (${tagSlug}::text IS NULL OR EXISTS (
        SELECT 1 FROM article_tags at 
        JOIN tags t ON at.tag_id = t.id 
        WHERE at.article_id = a.id AND t.slug = ${tagSlug}::text
      ))
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  // biome-ignore lint/suspicious/noExplicitAny: pg record
  let allTags: any[] = []
  if (articles.length > 0) {
    // biome-ignore lint/suspicious/noExplicitAny: pg record
    const articleIds = articles.map((a: any) => a.id)
    allTags = await sql`
      SELECT at.article_id, t.*
      FROM article_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.article_id = ANY(${articleIds}::int[])
    `
  }

  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const formattedArticles: Article[] = articles.map((a: any) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    content: a.content,
    excerpt: a.excerpt,
    author: a.author_id
      ? { id: a.author_id, username: a.author_username }
      : null,
    tags: allTags
      .filter((t) => t.article_id === a.id)
      .map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        created_at: t.created_at,
      })),
    is_published: a.is_published,
    view_count: a.view_count,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }))

  return c.json({
    data: formattedArticles,
    meta: { page, limit, total },
  })
})

articlesRoute.get('/:slug', async (c) => {
  const slug = c.req.param('slug')

  const articles = await sql`
    SELECT a.*, u.username as author_username
    FROM articles a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.slug = ${slug}
  `

  if (articles.length === 0) {
    return c.json({ data: null, error: 'Article not found' }, 404)
  }

  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const a = articles[0] as any

  await sql`UPDATE articles SET view_count = view_count + 1 WHERE id = ${a.id}`
  a.view_count += 1

  const tags = await sql`
    SELECT t.*
    FROM article_tags at
    JOIN tags t ON at.tag_id = t.id
    WHERE at.article_id = ${a.id}
  `

  const article: Article = {
    id: a.id,
    title: a.title,
    slug: a.slug,
    content: a.content,
    excerpt: a.excerpt,
    author: a.author_id
      ? { id: a.author_id, username: a.author_username }
      : null,
    // biome-ignore lint/suspicious/noExplicitAny: pg record
    tags: tags as any,
    is_published: a.is_published,
    view_count: a.view_count,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }

  return c.json({ data: article })
})

articlesRoute.post('/', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<CreateArticleRequest>()
  const { title, content, is_published, tag_ids } = body
  let { excerpt } = body

  if (!title || !content) {
    return c.json({ data: null, error: 'Title and content are required' }, 400)
  }

  const slug = await generateSlug(title)

  if (!excerpt) {
    excerpt = content.substring(0, 200)
  }

  const inserted = await sql`
    INSERT INTO articles (title, slug, content, excerpt, author_id, is_published)
    VALUES (${title}, ${slug}, ${content}, ${excerpt}, ${user.userId}, ${is_published || false})
    RETURNING *
  `
  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const article = inserted[0] as any

  if (tag_ids && tag_ids.length > 0) {
    for (const tagId of tag_ids) {
      await sql`INSERT INTO article_tags (article_id, tag_id) VALUES (${article.id}, ${tagId})`
    }
  }

  return c.json({ data: article }, 201)
})

articlesRoute.put('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<UpdateArticleRequest>()

  const existing = await sql`SELECT * FROM articles WHERE id = ${id}`
  if (existing.length === 0) {
    return c.json({ data: null, error: 'Article not found' }, 404)
  }
  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const current = existing[0] as any

  const title = body.title || current.title
  const slug =
    body.title && body.title !== current.title
      ? await generateSlug(body.title)
      : current.slug
  const content = body.content || current.content
  const excerpt = body.excerpt !== undefined ? body.excerpt : current.excerpt
  const is_published =
    body.is_published !== undefined ? body.is_published : current.is_published

  const updated = await sql`
    UPDATE articles
    SET title = ${title}, slug = ${slug}, content = ${content}, excerpt = ${excerpt}, is_published = ${is_published}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  if (body.tag_ids) {
    await sql`DELETE FROM article_tags WHERE article_id = ${id}`
    for (const tagId of body.tag_ids) {
      await sql`INSERT INTO article_tags (article_id, tag_id) VALUES (${id}, ${tagId})`
    }
  }

  return c.json({ data: updated[0] })
})

articlesRoute.delete('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await sql`SELECT * FROM articles WHERE id = ${id}`
  if (existing.length === 0) {
    return c.json({ data: null, error: 'Article not found' }, 404)
  }

  await sql`DELETE FROM articles WHERE id = ${id}`

  return c.json({ data: { message: 'Article deleted' } }, 200)
})

export default articlesRoute
