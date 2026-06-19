import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Article } from '../../../shared/types'
import { get } from '../api/client'
import { TagPill } from '../components/TagPill'
import './article-page.css'

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await get<{ data: Article }>(`/api/articles/${slug}`)
        setArticle(res.data)
        // biome-ignore lint/suspicious/noExplicitAny: error handling
      } catch (err: any) {
        setError(err.message || 'Article not found')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchArticle()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="article-page-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="article-page-error">
        <h1>{error || 'Article not found'}</h1>
        <Link to="/" className="btn-back">
          Back to Home
        </Link>
      </div>
    )
  }

  const date = new Date(article.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const renderMarkdown = (text: string) => {
    const paragraphs = text.split('\n\n')
    return paragraphs.map((p, idx) => {
      const isHeader = p.startsWith('#')
      if (isHeader) {
        const levelMatch = p.match(/^#+/)
        const level = levelMatch ? levelMatch[0].length : 1
        const content = p.replace(/^#+\s/, '')
        const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
        // biome-ignore lint/suspicious/noArrayIndexKey: simple markdown renderer
        return <Tag key={idx}>{content}</Tag>
      }
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: simple markdown renderer
        <p key={idx}>
          {p.split('\n').map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: simple markdown renderer
            <span key={i}>
              {line}
              {i < p.split('\n').length - 1 && <br />}
            </span>
          ))}
        </p>
      )
    })
  }

  return (
    <article className="article-page">
      <header className="article-header">
        <div className="article-tags">
          {article.tags?.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
        <h1 className="article-title-main">{article.title}</h1>
        <div className="article-meta-row">
          <div className="article-author-info">
            <span className="author-name">
              {article.author?.username || 'Anonymous'}
            </span>
            <span className="dot-sep">•</span>
            <span className="publish-date">{date}</span>
          </div>
          <div className="article-stats">
            <svg
              className="view-icon-large"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Views"
              role="img"
            >
              <title>Views</title>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {article.view_count} views
          </div>
        </div>
      </header>

      <div className="article-content">{renderMarkdown(article.content)}</div>
    </article>
  )
}
