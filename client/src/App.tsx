import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { AuthProvider } from './hooks/useAuth'
import { ArticlePage } from './pages/ArticlePage'
import { ChatHistoryPage } from './pages/ChatHistoryPage'
import { ChatPage } from './pages/ChatPage'
import { EditorPage } from './pages/EditorPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SearchPage } from './pages/SearchPage'
import { SemanticIndexPage } from './pages/SemanticIndexPage'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/history" element={<ChatHistoryPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="/articles/new" element={<EditorPage />} />
            <Route path="/articles/:id/edit" element={<EditorPage />} />
            <Route path="/articles/:slug" element={<ArticlePage />} />
            <Route path="/semantic-index" element={<SemanticIndexPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
