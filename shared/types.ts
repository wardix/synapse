export type User = {
  id: number
  username: string
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type RegisterRequest = {
  username: string
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  user: User
  token: string
}

export type Tag = {
  id: number
  name: string
  slug: string
  color: string | null
  created_at: string
}

export type Article = {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string | null
  author: { id: number; username: string } | null
  tags: Tag[]
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export type CreateArticleRequest = {
  title: string
  content: string
  excerpt?: string
  is_published?: boolean
  tag_ids?: number[]
}

export type UpdateArticleRequest = Partial<CreateArticleRequest>

export type ArticleListResponse = {
  data: Article[]
  meta: { page: number; limit: number; total: number }
}

export type CreateTagRequest = {
  name: string
  color?: string
}

export type UpdateTagRequest = Partial<CreateTagRequest>

export type SemanticIndexEntry = {
  id: number
  content: string
  created_at: string
}

export type CreateSemanticIndexRequest = {
  content: string
  article_ids?: number[]
}

export type SearchMode = 'fts' | 'semantic' | 'hybrid'

export type SearchFilters = {
  tag?: string
  author_id?: number
  limit?: number
}

export type FTSResult = {
  article: Article
  score: number
}

export type SemanticResult = {
  article: Article
  semantic_entry: SemanticIndexEntry
  score: number
}

export type HybridResult = {
  article: Article
  semantic_entry?: SemanticIndexEntry
  fts_score?: number
  semantic_score?: number
  combined_score: number
}

export type SearchResponse = {
  mode: SearchMode
  results: (FTSResult | SemanticResult | HybridResult)[]
  total: number
}
