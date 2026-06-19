import { useEffect, useState } from 'react'
import type { SearchMode, SearchResponse } from '../../../shared/types'
import { get } from '../api/client'

type UseSearchReturn = {
  query: string
  mode: SearchMode
  results: SearchResponse['results']
  isLoading: boolean
  total: number
  error: string | null
  setQuery: (query: string) => void
  setMode: (mode: SearchMode) => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('hybrid')
  const [results, setResults] = useState<SearchResponse['results']>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setTotal(0)
      setError(null)
      setIsLoading(false)
      return
    }

    const handler = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await get<{ data: SearchResponse }>(
          `/api/search?q=${encodeURIComponent(query)}&mode=${mode}`,
        )
        setResults(response.data.results)
        setTotal(response.data.total)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to execute search')
        }
        setResults([])
        setTotal(0)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query, mode])

  return {
    query,
    mode,
    results,
    isLoading,
    total,
    error,
    setQuery,
    setMode,
  }
}
