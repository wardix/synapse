import { Hono } from 'hono'
import type {
  CreateTagRequest,
  Tag,
  UpdateTagRequest,
} from '../../shared/types'
import { sql } from '../db/connection'
import { type AuthVariables, authMiddleware } from '../middleware/auth'
import { generateSlug } from '../utils/slug'
import { validateColor, validateString } from '../utils/validate'

const tagsRoute = new Hono<{ Variables: AuthVariables }>()

tagsRoute.get('/', async (c) => {
  const tags = await sql`SELECT * FROM tags ORDER BY name ASC`
  return c.json({ data: tags as Tag[] })
})

tagsRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<CreateTagRequest>()
  if (!body.name) {
    return c.json({ data: null, error: 'Name is required' }, 400)
  }

  const name = validateString(body.name, {
    minLength: 1,
    maxLength: 100,
    fieldName: 'name',
  })
  const color = body.color ? validateColor(body.color, 'color') : undefined

  const existing = await sql`SELECT 1 FROM tags WHERE name = ${name}`
  if (existing.length > 0) {
    return c.json(
      { data: null, error: 'Tag with this name already exists' },
      400,
    )
  }

  const slug = await generateSlug(name, 'tags')
  const finalColor = color || '#6366f1'

  const inserted = await sql`
    INSERT INTO tags (name, slug, color)
    VALUES (${name}, ${slug}, ${finalColor})
    RETURNING *
  `

  return c.json({ data: inserted[0] as Tag }, 201)
})

tagsRoute.put('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<UpdateTagRequest>()

  const existing = await sql`SELECT * FROM tags WHERE id = ${id}`
  if (existing.length === 0) {
    return c.json({ data: null, error: 'Tag not found' }, 404)
  }
  // biome-ignore lint/suspicious/noExplicitAny: pg record
  const current = existing[0] as any

  const name = body.name
    ? validateString(body.name, {
        minLength: 1,
        maxLength: 100,
        fieldName: 'name',
      })
    : current.name
  let slug = current.slug
  if (body.name && name !== current.name) {
    const duplicate =
      await sql`SELECT 1 FROM tags WHERE name = ${name} AND id != ${id}`
    if (duplicate.length > 0) {
      return c.json(
        { data: null, error: 'Tag with this name already exists' },
        400,
      )
    }
    slug = await generateSlug(name, 'tags')
  }

  const color =
    body.color !== undefined
      ? body.color
        ? validateColor(body.color, 'color')
        : null
      : current.color

  const updated = await sql`
    UPDATE tags
    SET name = ${name}, slug = ${slug}, color = ${color}
    WHERE id = ${id}
    RETURNING *
  `

  return c.json({ data: updated[0] as Tag })
})

tagsRoute.delete('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))

  const existing = await sql`SELECT * FROM tags WHERE id = ${id}`
  if (existing.length === 0) {
    return c.json({ data: null, error: 'Tag not found' }, 404)
  }

  await sql`DELETE FROM tags WHERE id = ${id}`

  return c.json({ data: { message: 'Tag deleted' } })
})

export default tagsRoute
