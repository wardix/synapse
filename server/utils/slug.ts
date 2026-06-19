import { sql } from '../db/connection'

export const generateSlug = async (
  title: string,
  table = 'articles',
): Promise<string> => {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  if (!baseSlug) return 'article'

  let slug = baseSlug
  let counter = 1
  let exists = true

  while (exists) {
    let result: unknown[] = []
    if (table === 'articles') {
      result = await sql`SELECT 1 FROM articles WHERE slug = ${slug}`
    } else {
      result = await sql`SELECT 1 FROM tags WHERE slug = ${slug}`
    }

    if (result.length === 0) {
      exists = false
    } else {
      slug = `${baseSlug}-${counter}`
      counter++
    }
  }

  return slug
}
