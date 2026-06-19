import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './navbar.css'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="glow">Synapse</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/search" className="nav-link">
            Search
          </Link>
          <Link to="/chat" className="nav-link">
            Chat
          </Link>
          <Link to="/semantic-index" className="nav-link">
            Semantic Index
          </Link>
        </div>

        <div className="navbar-auth">
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
