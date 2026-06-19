import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useChat } from '../hooks/useChat'
import './chat-page.css'

export function ChatPage() {
  const { messages, isStreaming, error, sendMessage } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage(input)
    setInput('')
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>Ask Synapse</h1>
        <p>Get AI-powered answers grounded in your knowledge base.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: chat message list
          <div key={idx} className={`chat-message ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <>
                <MarkdownRenderer content={msg.content} />
                {isStreaming && idx === messages.length - 1 && (
                  <span className="cursor-blink">▋</span>
                )}
                {msg.retrievals && msg.retrievals.length > 0 && (
                  <div className="chat-retrievals">
                    <h4>Sources:</h4>
                    {msg.retrievals.map((r, rIdx) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: retrievals
                      <div key={rIdx} className="retrieval-item">
                        <div className="retrieval-meta">
                          <span>
                            Similarity: {(r.similarity_score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p>{r.content.substring(0, 100)}...</p>
                        {r.article_slug && r.article_title && (
                          <Link to={`/articles/${r.article_slug}`}>
                            Read: {r.article_title}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isStreaming}
          />
          <button
            type="submit"
            className="chat-submit"
            disabled={isStreaming || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
