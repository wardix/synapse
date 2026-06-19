import { useCallback, useState } from 'react'
import type { ChatDetail, ChatMessage } from '../../../shared/types'
import { get, post } from '../api/client'

export function useChatHistory() {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchHistory = useCallback(async (page = 1, limit = 20) => {
    setIsLoading(true)
    setError('')
    try {
      const response = await get<{
        data: ChatMessage[]
        meta: { total: number }
      }>(`/api/chat/history?page=${page}&limit=${limit}`)
      setHistory(response.data)
      setTotal(response.meta.total)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch chat history',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchChatDetail = useCallback(async (id: number) => {
    try {
      const response = await get<{ data: ChatDetail }>(`/api/chat/${id}`)
      return response.data
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to fetch chat detail',
      )
    }
  }, [])

  const promoteChat = useCallback(
    async (chatId: number, articleIds: number[]) => {
      try {
        const response = await post<{ data: { id: number } }>(
          `/api/chat/${chatId}/promote`,
          {
            article_ids: articleIds,
          },
        )
        return response.data
      } catch (err) {
        throw new Error(
          err instanceof Error ? err.message : 'Failed to promote chat',
        )
      }
    },
    [],
  )

  return {
    history,
    total,
    isLoading,
    error,
    fetchHistory,
    fetchChatDetail,
    promoteChat,
  }
}
