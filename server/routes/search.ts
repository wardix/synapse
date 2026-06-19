import { Hono } from 'hono'
import type {
  FTSResult,
  HybridResult,
  SemanticResult,
} from '../../shared/types'
import { searchFTS, searchHybrid, searchSemantic } from '../services/search'
import { validateNumber, validateString } from '../utils/validate'

const searchRoute = new Hono()

searchRoute.get('/', async (c) => {
  const q = c.req.query('q')
  const mode = c.req.query('mode') || 'hybrid'

  if (!q) {
    return c.json({ data: null, error: 'Query parameter "q" is required' }, 400)
  }
  const query = validateString(q, {
    minLength: 1,
    maxLength: 500,
    fieldName: 'q',
  })

  const tag = c.req.query('tag')
    ? validateString(c.req.query('tag'), { maxLength: 100, fieldName: 'tag' })
    : undefined
  const author_id = c.req.query('author_id')
    ? validateNumber(c.req.query('author_id'), {
        min: 1,
        fieldName: 'author_id',
      })
    : undefined
  const limit = c.req.query('limit')
    ? validateNumber(c.req.query('limit'), {
        min: 1,
        max: 100,
        fieldName: 'limit',
      })
    : undefined

  if (mode !== 'fts' && mode !== 'semantic' && mode !== 'hybrid') {
    return c.json({ data: null, error: 'Invalid search mode' }, 400)
  }

  const filters = { tag, author_id, limit }

  let results: (FTSResult | SemanticResult | HybridResult)[] = []
  if (mode === 'fts') {
    results = await searchFTS(query, filters)
  } else if (mode === 'semantic') {
    results = await searchSemantic(query, filters)
  } else {
    results = await searchHybrid(query, filters)
  }

  return c.json({
    data: {
      mode,
      results,
      total: results.length,
    },
  })
})

export default searchRoute
