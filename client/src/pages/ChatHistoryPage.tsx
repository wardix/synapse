import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ChatDetail } from '../../../shared/types'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useChatHistory } from '../hooks/useChatHistory'
import './chat-history-page.css'

export function ChatHistoryPage() {
  const {
    history,
    isLoading,
    error,
    fetchHistory,
    fetchChatDetail,
    promoteChat,
  } = useChatHistory()
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null)
  const [isPromoting, setIsPromoting] = useState(false)
  const [promoteSuccess, setPromoteSuccess] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleChatClick = async (id: number) => {
    try {
      const detail = await fetchChatDetail(id)
      setSelectedChat(detail)
      setPromoteSuccess(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePromote = async () => {
    if (!selectedChat) return
    const articleIds = selectedChat.retrievals
      .map((r) => r.article_id)
      .filter((id): id is number => id !== null && id !== undefined)

    if (articleIds.length === 0) return

    setIsPromoting(true)
    try {
      await promoteChat(selectedChat.id, articleIds)
      setPromoteSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsPromoting(false)
    }
  }

  if (selectedChat) {
    return (
      <div className="chat-history-page">
        <button
          type="button"
          className="back-button"
          onClick={() => setSelectedChat(null)}
        >
          &larr; Back to History
        </button>

        <div className="chat-detail-view glass-panel">
          <h2 className="chat-detail-question">{selectedChat.question}</h2>

          <div className="chat-detail-answer">
            <MarkdownRenderer content={selectedChat.answer} />
          </div>

          <div className="chat-retrievals">
            <h3>Sources used:</h3>
            {selectedChat.retrievals.map((r, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: retrievals list
              <div key={idx} className="retrieval-item">
                <div className="retrieval-meta">
                  <span>
                    Similarity: {(r.similarity_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p>{r.content.substring(0, 150)}...</p>
                {r.article_slug && r.article_title && (
                  <Link to={`/articles/${r.article_slug}`}>
                    Read: {r.article_title}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="promote-section">
            <h3>Promote this Question</h3>
            <p>
              If this was a good question and answer, promote it to the
              knowledge base to improve future RAG retrieval accuracy.
            </p>
            <button
              type="button"
              className="promote-button"
              onClick={handlePromote}
              disabled={
                isPromoting ||
                promoteSuccess ||
                selectedChat.retrievals.length === 0
              }
            >
              {promoteSuccess
                ? 'Promoted!'
                : isPromoting
                  ? 'Promoting...'
                  : 'Promote to Semantic Index'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-history-page">
      <div className="history-header">
        <h1>Chat History</h1>
        <p>Review your past conversations with Synapse.</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {isLoading && <p>Loading history...</p>}

      {!isLoading && history.length === 0 && !error && (
        <div className="glass-panel text-center">
          <p>No chat history found. Start a conversation!</p>
          <Link to="/chat" className="btn btn-primary mt-4 inline-block">
            Go to Chat
          </Link>
        </div>
      )}

      <div className="history-list">
        {history.map((chat) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: Clickable history item
          // biome-ignore lint/a11y/noStaticElementInteractions: Clickable history item
          <div
            key={chat.id}
            className="history-item glass-panel"
            onClick={() => handleChatClick(chat.id)}
          >
            <div className="history-item-header">
              <h3 className="history-question">{chat.question}</h3>
              <span className="history-date">
                {new Date(chat.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="history-answer">{chat.answer}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
