import { useCallback, useState } from 'react'
import type { SemanticIndexEntry } from '../../../shared/types'
import { del, get, post } from '../api/client'

export function useSemanticIndex() {
  const [entries, setEntries] = useState<SemanticIndexEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)

  const fetchEntries = useCallback(async (page = 1, limit = 20) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await get<{
        data: SemanticIndexEntry[]
        meta: { total: number }
      }>(`/api/semantic-index?page=${page}&limit=${limit}`)
      setEntries(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addEntry = async (content: string, articleIds?: number[]) => {
    try {
      const res = await post<{ data: SemanticIndexEntry }>(
        '/api/semantic-index',
        {
          content,
          article_ids: articleIds,
        },
      )
      // Prepend to list or re-fetch (we'll just prepend and let the user refresh or re-fetch)
      setEntries((prev) => [res.data, ...prev])
      setTotal((t) => t + 1)
      return true
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add entry')
    }
  }

  const deleteEntry = async (id: number) => {
    try {
      await del(`/api/semantic-index/${id}`)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setTotal((t) => t - 1)
      return true
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete entry')
    }
  }

  const bulkDelete = async (ids: number[]) => {
    try {
      // API doesn't support bulk delete, send individually
      await Promise.all(ids.map((id) => del(`/api/semantic-index/${id}`)))
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
      setTotal((t) => t - ids.length)
      return true
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to bulk delete')
    }
  }

  return {
    entries,
    isLoading,
    error,
    total,
    fetchEntries,
    addEntry,
    deleteEntry,
    bulkDelete,
  }
}
