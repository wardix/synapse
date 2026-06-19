import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article, ArticleListResponse } from '../../../shared/types'
import { get } from '../api/client'
import { ArticleCard } from '../components/ArticleCard'
import { useAuth } from '../hooks/useAuth'
import './home-page.css'

export function HomePage() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalArticles: 0 })

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await get<ArticleListResponse>('/api/articles?limit=12')
        setArticles(res.data)
        setStats({ totalArticles: res.meta.total })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            {user ? `Welcome back, ${user.username}!` : 'Welcome to Synapse'}
          </h1>
          <p className="hero-subtitle">
            Connect your knowledge. Ask naturally. Get answers.
          </p>
          <div className="hero-actions">
            <Link to="/search" className="btn-primary">
              Search Knowledge
            </Link>
            <div className="stats-badge">
              <span className="stats-number">{stats.totalArticles}</span>{' '}
              Articles
            </div>
          </div>
        </div>
      </section>

      <section className="recent-articles">
        <div className="section-header">
          <h2>Recent Articles</h2>
          <Link to="/search" className="view-all">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="responsive-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton" style={{ height: '250px' }} />
            ))}
          </div>
        ) : (
          <div className="responsive-grid">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
