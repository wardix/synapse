<p align="center">
  <h1 align="center">🧠 Synapse</h1>
  <p align="center"><strong>Connect your knowledge. Ask naturally. Get answers.</strong></p>
  <p align="center">
    A knowledge base platform with RAG-powered natural language search and AI-generated answers backed by your own content.
  </p>
</p>

---

## Overview

**Synapse** is a web-based knowledge base that combines article management with **Retrieval-Augmented Generation (RAG)**. Store, organize, and search your team's knowledge — then ask questions in natural language and get accurate, citation-backed answers derived from your content.

## Key Features

- 📝 **Article Management** — Create and organize articles in Markdown with tags, drafts, and live preview
- 🔍 **Dual Search** — Full-text search (PostgreSQL GIN) + semantic search (pgvector cosine similarity), with a hybrid mode combining both
- 🤖 **RAG Chat with Citations** — Ask questions in natural language, get streaming AI answers with references to source articles
- 🔄 **Feedback Loop** — Review chat history, inspect retrieval scores, and promote questions to improve future accuracy
- 🧩 **Semantic Index** — Curate a searchable index of knowledge entries with auto-generated embeddings
- 🔐 **Authentication** — JWT-based auth with secure password hashing

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Frontend | [Vite](https://vitejs.dev) + [React](https://react.dev) + TypeScript |
| Backend | [Hono](https://hono.dev) (on Bun) |
| Database | [PostgreSQL](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) |
| SQL | Raw SQL via `Bun.sql` (zero ORM) |
| Embeddings | Google Gemini Embedding API (`text-embedding-004`) |
| LLM | Google Gemini API (`gemini-2.5-flash`) |
| Auth | JWT (bcrypt + jose) |
| Styling | Vanilla CSS |

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://www.docker.com) & Docker Compose (for PostgreSQL)
- [Google Gemini API key](https://aistudio.google.com/apikey)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/synapse.git
cd synapse

# 2. Copy environment variables and fill in your values
cp .env.example .env

# 3. Start PostgreSQL with pgvector
docker-compose up -d

# 4. Install dependencies
bun install

# 5. Run database migrations
bun run migrate

# 6. Start the development server
bun run dev
```

The app will be available at `http://localhost:5173` (client) with the API at `http://localhost:3000`.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://synapse:synapse@localhost:5432/synapse` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `JWT_SECRET` | Secret key for JWT signing | — |
| `JWT_EXPIRES_IN` | JWT token expiration duration | `7d` |
| `SERVER_PORT` | Backend server port | `3000` |
| `VITE_API_URL` | API base URL for the client | `http://localhost:3000/api` |

## Project Structure

```
kb/
├── server/                 # Backend (Hono + Bun)
│   ├── index.ts            # Server entry point
│   ├── db/                 # Database connection & migrations
│   ├── routes/             # API route handlers
│   ├── middleware/          # Auth & CORS middleware
│   ├── services/           # Business logic (embedding, LLM, RAG, search)
│   └── types/              # Server-side types
│
├── client/                 # Frontend (Vite + React)
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client
│   │   └── utils/          # Utilities (markdown config, etc.)
│   └── public/             # Static assets
│
├── shared/                 # Shared types between server & client
│   └── types.ts
│
├── docker-compose.yml      # PostgreSQL + pgvector for local dev
├── PRD.md                  # Product Requirements Document
└── ARCHITECTURE.md         # Technical Architecture Plan
```

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start both server and client in development mode |
| `bun run dev:server` | Start only the backend server |
| `bun run dev:client` | Start only the frontend client |
| `bun run migrate` | Run database migrations |
| `bun run build` | Build the production bundle |

## Documentation

- [PRD.md](./PRD.md) — Product Requirements Document with user stories, data model, and rollout plan
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical architecture, database schema, API endpoints, and implementation phases

## License

[MIT](./LICENSE)
