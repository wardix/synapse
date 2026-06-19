import { Link } from 'react-router-dom'
import type { SearchMode } from '../../../shared/types'
import { SearchBar } from '../components/SearchBar'
import { useSearch } from '../hooks/useSearch'
import './search-page.css'

export function SearchPage() {
  const { query, mode, results, isLoading, total, error, setQuery, setMode } =
    useSearch()

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode)
  }

  // biome-ignore lint/suspicious/noExplicitAny: complex union
  const renderScore = (result: any) => {
    if (mode === 'fts') {
      return (
        <span className="score-badge fts" title="Full-Text Search Rank">
          FTS: {(result.score * 100).toFixed(0)}
        </span>
      )
    }
    if (mode === 'semantic') {
      return (
        <span className="score-badge semantic" title="Cosine Similarity">
          Sim: {(result.score * 100).toFixed(0)}%
        </span>
      )
    }
    return (
      <span className="score-badge hybrid" title="Combined Hybrid Score">
        Score: {(result.combined_score * 100).toFixed(0)}
      </span>
    )
  }

  return (
    <div className="search-page-container fade-in">
      <div className="search-header">
        <h1 className="search-title">Knowledge Base Search</h1>
        <p className="search-subtitle">
          Find exactly what you need using keyword or semantic search.
        </p>
      </div>

      <div className="search-bar-wrapper">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search articles, topics, or ask a question..."
          autoFocus={true}
          isLoading={isLoading}
        />
      </div>

      <div className="search-mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === 'fts' ? 'active' : ''}`}
          onClick={() => handleModeChange('fts')}
        >
          Keyword
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'semantic' ? 'active' : ''}`}
          onClick={() => handleModeChange('semantic')}
        >
          Semantic
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === 'hybrid' ? 'active' : ''}`}
          onClick={() => handleModeChange('hybrid')}
        >
          Hybrid
        </button>
      </div>

      {error && <div className="search-error">{error}</div>}

      <div className="search-results-container">
        {!query || query.trim().length < 2 ? (
          <div className="search-empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Search icon</title>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Type at least 2 characters to start searching</p>
          </div>
        ) : isLoading && results.length === 0 ? (
          <div className="search-loading-state">
            <div
              className="skeleton"
              style={{ height: '160px', marginBottom: '1.5rem' }}
            />
            <div
              className="skeleton"
              style={{ height: '160px', marginBottom: '1.5rem' }}
            />
            <div
              className="skeleton"
              style={{ height: '160px', marginBottom: '1.5rem' }}
            />
          </div>
        ) : results.length === 0 && !isLoading ? (
          <div className="search-empty-state">
            <p>No articles match your search for "{query}"</p>
            <p className="search-hint">
              Try adjusting your keywords or switching to Semantic mode.
            </p>
          </div>
        ) : (
          <>
            <div className="results-count">
              Found {total} result{total !== 1 ? 's' : ''} for "{query}"
            </div>
            <div className="results-list">
              {results.map((result, index) => (
                <div
                  key={result.article.id}
                  className="result-card glass-panel"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="result-header">
                    <Link
                      to={`/articles/${result.article.slug}`}
                      className="result-title"
                    >
                      {result.article.title}
                    </Link>
                    {renderScore(result)}
                  </div>

                  <p className="result-excerpt">
                    {result.article.excerpt ||
                      `${result.article.content.substring(0, 150)}...`}
                  </p>

                  {/* biome-ignore lint/suspicious/noExplicitAny: complex union */}
                  {(result as any).semantic_entry && (
                    <div className="semantic-match">
                      <strong>Semantic Match:</strong>{' '}
                      {/* biome-ignore lint/suspicious/noExplicitAny: complex union */}
                      {(result as any).semantic_entry.content}
                    </div>
                  )}

                  <div className="result-footer">
                    <div className="result-tags">
                      {result.article.tags.map((t) => (
                        <span key={t.id} className="tag-pill">
                          {t.name}
                        </span>
                      ))}
                    </div>
                    {result.article.author && (
                      <span className="result-author">
                        By {result.article.author.username}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
