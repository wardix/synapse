import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ArticlePage from './pages/ArticlePage'
import ChatHistoryPage from './pages/ChatHistoryPage'
import ChatPage from './pages/ChatPage'
import EditorPage from './pages/EditorPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SearchPage from './pages/SearchPage'
import SemanticIndexPage from './pages/SemanticIndexPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/history" element={<ChatHistoryPage />} />
        <Route path="/articles/new" element={<EditorPage />} />
        <Route path="/articles/:id/edit" element={<EditorPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/semantic-index" element={<SemanticIndexPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
