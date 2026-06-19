import { useCallback, useState } from 'react'
import type { ChatRetrieval } from '../../../shared/types'
import { getApiUrl, getHeaders } from '../api/client'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  retrievals?: ChatRetrieval[]
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setIsStreaming(true)
    setError('')

    try {
      const url = `${getApiUrl()}/api/chat`
      const headers = getHeaders()

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      })

      if (!response.ok) {
        let errMessage = 'Failed to fetch'
        try {
          const errData = await response.json()
          errMessage = errData.error || errMessage
        } catch {}
        throw new Error(errMessage)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      if (!response.body)
        throw new Error('ReadableStream not yet supported in this browser.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false
      let fullResponse = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6)
              if (dataStr === '[DONE]') {
                done = true
                break
              }
              try {
                const parsed = JSON.parse(dataStr)
                if (parsed.chunk) {
                  fullResponse += parsed.chunk
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    lastMessage.content = fullResponse
                    return newMessages
                  })
                } else if (parsed.retrievals) {
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    lastMessage.retrievals = parsed.retrievals
                    return newMessages
                  })
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, dataStr)
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error(err)
    } finally {
      setIsStreaming(false)
    }
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
  }
}
