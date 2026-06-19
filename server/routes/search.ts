import { Hono } from 'hono'
import type {
  FTSResult,
  HybridResult,
  SemanticResult,
} from '../../shared/types'
import { searchFTS, searchHybrid, searchSemantic } from '../services/search'

const searchRoute = new Hono()

searchRoute.get('/', async (c) => {
  const q = c.req.query('q')
  const mode = c.req.query('mode') || 'hybrid'
  const tag = c.req.query('tag')
  const author_id = c.req.query('author_id')
    ? Number(c.req.query('author_id'))
    : undefined
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined

  if (!q || q.trim() === '') {
    return c.json({ data: null, error: 'Query parameter "q" is required' }, 400)
  }

  if (mode !== 'fts' && mode !== 'semantic' && mode !== 'hybrid') {
    return c.json({ data: null, error: 'Invalid search mode' }, 400)
  }

  const filters = { tag, author_id, limit }

  let results: (FTSResult | SemanticResult | HybridResult)[] = []
  if (mode === 'fts') {
    results = await searchFTS(q, filters)
  } else if (mode === 'semantic') {
    results = await searchSemantic(q, filters)
  } else {
    results = await searchHybrid(q, filters)
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
