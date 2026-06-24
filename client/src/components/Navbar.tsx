import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './navbar.css'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="glow">Synapse</span>
        </Link>

        <button
          type="button"
          className="hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span
            className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}
          />
          <span
            className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}
          />
          <span
            className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}
          />
        </button>

        <div
          className={`navbar-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        >
          <Link to="/" className="nav-link" onClick={closeMobileMenu}>
            Home
          </Link>
          <Link to="/search" className="nav-link" onClick={closeMobileMenu}>
            Search
          </Link>
          <Link to="/chat" className="nav-link" onClick={closeMobileMenu}>
            Chat
          </Link>
          <Link
            to="/semantic-index"
            className="nav-link"
            onClick={closeMobileMenu}
          >
            Semantic Index
          </Link>
          {isAuthenticated && (
            <Link
              to="/editor"
              className="nav-link"
              onClick={closeMobileMenu}
            >
              + New Article
            </Link>
          )}

          <div className="navbar-auth-mobile">
            {isAuthenticated && user ? (
              <div className="auth-user">
                <span className="username">{user.username}</span>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    closeMobileMenu()
                  }}
                  className="btn-logout"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-login" onClick={closeMobileMenu}>
                Login
              </Link>
            )}
          </div>
        </div>

        <div className="navbar-auth desktop-only">
          {isAuthenticated && user ? (
            <div className="auth-user">
              <span className="username">{user.username}</span>
              <button type="button" onClick={logout} className="btn-logout">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-login">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
