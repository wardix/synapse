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
