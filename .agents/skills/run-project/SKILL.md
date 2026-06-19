---
name: run-project
description: How to set up and run the Synapse project locally
---

# Running Synapse Locally

## Prerequisites

1. **Bun** — Install from [bun.sh](https://bun.sh). Verify with `bun --version`.
2. **PostgreSQL** with **pgvector** extension installed.
   - macOS: `brew install postgresql pgvector`
   - Docker: use the provided `docker-compose.yml`
3. **Google Gemini API key** — Needed for embeddings (`text-embedding-004`) and LLM (`gemini-2.5-flash`).

## Step 1: Environment Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/synapse

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# JWT
JWT_SECRET=your_jwt_secret_here

# Server
PORT=3000

# Client (Vite dev server)
VITE_API_URL=http://localhost:3000/api
```

## Step 2: Start PostgreSQL

**Option A: Docker Compose (recommended)**

```bash
docker-compose up -d
```

This starts PostgreSQL with pgvector pre-installed on port `5432`.

**Option B: Local PostgreSQL**

Ensure PostgreSQL is running and pgvector is installed:

```bash
# macOS (Homebrew)
brew services start postgresql

# Enable pgvector extension (run once)
psql -d synapse -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Create the database if it doesn't exist:

```bash
createdb synapse
```

## Step 3: Install Dependencies

```bash
bun install
```

This installs all dependencies for the monorepo (server + client + shared).

## Step 4: Run Migrations

```bash
bun run migrate
```

This executes the migration runner (`server/db/migrate.ts`), which applies all pending SQL migrations from `server/db/migrations/` in sequential order.

## Step 5: Start Development Server

```bash
bun run dev
```

This starts both the backend and frontend dev servers concurrently:

| Service | URL | Description |
|---|---|---|
| **Backend** (Hono) | `http://localhost:3000` | API server |
| **Frontend** (Vite) | `http://localhost:5173` | React dev server with HMR |

The Vite dev server proxies `/api` requests to the Hono backend.

## Useful Commands

| Command | Description |
|---|---|
| `bun run dev` | Start both server and client in dev mode |
| `bun run dev:server` | Start only the backend |
| `bun run dev:client` | Start only the frontend |
| `bun run migrate` | Run database migrations |
| `bun run build` | Build for production |
| `bun test` | Run tests |

## Troubleshooting

### Database Connection Failed
- Ensure PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env`
- Ensure the database exists: `psql -l | grep synapse`

### pgvector Extension Not Found
- Install pgvector: `brew install pgvector` (macOS) or use the Docker setup
- Enable it: `psql -d synapse -c "CREATE EXTENSION IF NOT EXISTS vector;"`

### Gemini API Errors
- Verify your `GEMINI_API_KEY` is valid
- Check API quota at [Google AI Studio](https://aistudio.google.com/)

### Port Already in Use
- Kill the process: `lsof -ti:3000 | xargs kill` (backend) or `lsof -ti:5173 | xargs kill` (frontend)
