import { Link } from 'react-router-dom'
import type { Article } from '../../../shared/types'
import { TagPill } from './TagPill'
import './article-card.css'

export function ArticleCard({ article }: { article: Article }) {
  const date = new Date(article.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="article-card glass-panel">
      <div className="article-card-content">
        <div className="article-card-tags">
          {article.tags?.slice(0, 3).map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
          {article.tags && article.tags.length > 3 && (
            <span className="tag-more">+{article.tags.length - 3}</span>
          )}
        </div>
        <Link to={`/articles/${article.slug}`} className="article-title-link">
          <h3 className="article-title">{article.title}</h3>
        </Link>
        <p className="article-excerpt">{article.excerpt}</p>
      </div>
      <div className="article-card-footer">
        <div className="article-meta">
          <span className="article-author">
            {article.author?.username || 'Anonymous'}
          </span>
          <span className="article-date">{date}</span>
        </div>
        <div className="article-views">
          <svg
            className="view-icon"
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
          {article.view_count}
        </div>
      </div>
    </div>
  )
}
