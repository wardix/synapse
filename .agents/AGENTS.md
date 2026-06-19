# Synapse — Agent Rules & Conventions

## Project Overview

**Synapse** is a web-based knowledge base platform that combines article management with **RAG (Retrieval-Augmented Generation)** capabilities. It allows teams to store, organize, and search knowledge — then ask questions in natural language and receive accurate answers grounded in stored content.

> *Connect your knowledge. Ask naturally. Get answers.*

Before starting any work, read these documents:
- **PRD**: [PRD.md](file:///Users/wiliam/agy/kb/PRD.md) — Product requirements, user stories, data model, and UI pages
- **Architecture Plan**: [ARCHITECTURE.md](file:///Users/wiliam/agy/kb/ARCHITECTURE.md) — Tech stack, project structure, database schema, API endpoints, and implementation phases

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Bun |
| **Backend** | Hono (on Bun) |
| **Frontend** | Vite + React + TypeScript |
| **Database** | PostgreSQL + pgvector |
| **SQL** | Raw SQL via `Bun.sql` — **NO ORM** |
| **Embeddings** | Google Gemini Embedding API (`text-embedding-004`, 768 dimensions) |
| **LLM** | Google Gemini API (`gemini-2.5-flash`) |
| **Auth** | JWT-based (bcrypt + jose) |
| **Styling** | Vanilla CSS |
| **Testing** | `bun:test` (built-in) |

---

## Project Structure

Synapse is a monorepo with three top-level directories:

```
kb/
├── package.json
├── bunfig.toml
├── tsconfig.json
│
├── server/                    # Backend (Hono + Bun)
│   ├── index.ts               # Entry point, Hono app setup
│   ├── db/
│   │   ├── connection.ts      # Bun.sql PostgreSQL connection
│   │   ├── migrate.ts         # Migration runner
│   │   └── migrations/        # Sequential SQL migration files
│   ├── routes/                # Hono route handlers
│   ├── middleware/             # Auth, CORS, etc.
│   ├── services/              # Business logic (embedding, LLM, RAG, search, auth)
│   └── types/                 # Server-specific types
│
├── client/                    # Frontend (Vite + React)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Router + layout
│       ├── index.css          # Global styles + design system
│       ├── api/               # API client (fetch wrapper)
│       ├── hooks/             # Custom React hooks
│       ├── pages/             # Page components
│       ├── components/        # Reusable UI components
│       └── utils/             # Utilities (markdown, helpers)
│
└── shared/                    # Shared between server & client
    └── types.ts               # API request/response types
```

Tests live **next to the code** they test:
```
server/routes/articles.ts       → server/routes/articles.test.ts
server/services/search.ts       → server/services/search.test.ts
client/src/utils/markdown.ts    → client/src/utils/markdown.test.ts
client/src/hooks/useAuth.ts     → client/src/hooks/useAuth.test.ts
```

- **`server/`** — All backend code. Hono routes, database operations, embedding/LLM services, and auth middleware.
- **`client/`** — All frontend code. Vite-powered React SPA with vanilla CSS styling.
- **`shared/`** — TypeScript types shared between server and client (API contracts, data shapes).

---

## Coding Conventions

### General

- TypeScript **strict mode** enabled — no exceptions.
- **Never use `any`**. Use `unknown` and narrow types instead.
- Use `type` for object shapes and data structures (e.g., `type Article = { ... }`).
- Use `interface` for contracts and extensible abstractions (e.g., `interface SearchProvider { ... }`).
- Always handle errors explicitly — no silent catches, no swallowed exceptions.
- Prefer `const` over `let`. Never use `var`.
- Use early returns to reduce nesting.
- Prefer named exports over default exports.

### File Naming

| Context | Convention | Example |
|---|---|---|
| Server files | `kebab-case.ts` | `semantic-index.ts`, `auth.ts` |
| React components | `PascalCase.tsx` | `ChatPage.tsx`, `ArticleCard.tsx` |
| React pages | `PascalCase.tsx` | `HomePage.tsx`, `EditorPage.tsx` |
| SQL migrations | `NNN_snake_case.sql` | `001_create_users.sql`, `009_add_column_x.sql` |
| CSS files | `kebab-case.css` | `index.css`, `article-card.css` |
| Shared types | `kebab-case.ts` | `types.ts` |

### Database & SQL

- **ALWAYS** use raw SQL via `Bun.sql` — **NEVER** use an ORM or query builder (no Prisma, Drizzle, Knex, etc.).
- **ALWAYS** use parameterized queries to prevent SQL injection:
  ```typescript
  // ✅ Correct — parameterized
  const results = await sql`SELECT * FROM articles WHERE id = ${articleId}`;

  // ❌ Wrong — string interpolation (SQL injection risk)
  const results = await sql`SELECT * FROM articles WHERE id = ${`'${articleId}'`}`;
  ```
- Table names: `snake_case`, plural (e.g., `articles`, `chat_messages`, `article_tags`).
- Column names: `snake_case` (e.g., `created_at`, `is_published`, `view_count`).
- Foreign keys: `<singular_table>_id` (e.g., `author_id`, `article_id`, `tag_id`).
- Index names: `idx_<table>_<column>` (e.g., `idx_articles_fts`, `idx_semantic_index_embedding`).
- Timestamps: always use `TIMESTAMPTZ` with `DEFAULT NOW()`.
- Primary keys: `SERIAL PRIMARY KEY` named `id`.
- Use `IF NOT EXISTS` in migrations where possible for idempotency.
- Never modify existing migration files — always create a new migration.

### API Conventions

- All API routes are prefixed with `/api/` (e.g., `/api/articles`, `/api/chat`).
- Standard response envelope format:
  ```typescript
  // Success response
  { data: T }

  // Success response with pagination
  { data: T[], meta: { page: number, limit: number, total: number } }

  // Error response
  { data: null, error: string }
  ```
- Use appropriate HTTP status codes:
  - `200` — Success (GET, PUT)
  - `201` — Created (POST)
  - `400` — Bad Request (validation errors)
  - `401` — Unauthorized (missing/invalid JWT)
  - `404` — Not Found
  - `500` — Internal Server Error
- Pagination via query params: `?page=1&limit=20` (both default to page 1, limit 20).
- Always validate input before performing database operations.
- Return meaningful error messages in the `error` field.

### Frontend

- React **functional components only** — no class components.
- Custom hooks for shared logic, always prefixed with `use` (e.g., `useAuth`, `useSearch`, `useArticles`).
- All API calls go through `client/src/api/client.ts` — no direct `fetch()` in components.
- Styles in **vanilla CSS** — no Tailwind CSS, no CSS-in-JS, no styled-components.
- Each page component in its own file in `client/src/pages/` (e.g., `ChatPage.tsx`, `HomePage.tsx`).
- Reusable components in `client/src/components/` (e.g., `Navbar.tsx`, `ArticleCard.tsx`).
- Props types defined at the top of the component file:
  ```typescript
  type ArticleCardProps = {
    article: Article;
    onTagClick?: (tagId: number) => void;
  };
  ```
- Use React Router for routing. All route definitions in `App.tsx`.
- Dark mode is the default theme.

### Testing (TDD)

- **Test-Driven Development is mandatory** — always write tests **before** implementation.
- Follow the **RED → GREEN → REFACTOR** cycle:
  1. **RED** — Write a failing test that describes the expected behavior.
  2. **GREEN** — Write the minimum code to make the test pass.
  3. **REFACTOR** — Clean up the code while keeping all tests green.
- Test runner: **`bun:test`** (built-in, no additional dependencies).
- Test files live next to the code they test with `.test.ts` / `.test.tsx` suffix.
- Every route, service, and utility function **must have corresponding tests**.
- Test API routes using Hono's `app.fetch()` — no need to start a real server.
- Use `mock()` from `bun:test` for mocking dependencies.
- Run tests: `bun test` (all), `bun test --watch` (watch mode).
- **A feature is not complete until all its tests pass.**

### Git

- **Conventional Commits** for all commit messages:
  - `feat:` — New feature (e.g., `feat: add semantic search endpoint`)
  - `fix:` — Bug fix (e.g., `fix: handle empty search query`)
  - `chore:` — Maintenance tasks (e.g., `chore: update dependencies`)
  - `docs:` — Documentation (e.g., `docs: add API usage examples`)
  - `refactor:` — Code refactoring (e.g., `refactor: extract search service`)
- **Branch naming**: `feature/<name>`, `fix/<name>`, `chore/<name>` (e.g., `feature/rag-chat`, `fix/search-ranking`).

---

## Do's and Don'ts

### ✅ Do

- **Read PRD.md and ARCHITECTURE.md** before starting any work.
- **Run migrations** after creating new `.sql` files (`bun run migrate`).
- **Use parameterized queries** for all SQL operations.
- **Write TypeScript types** for all data structures — in `shared/types.ts` for API contracts, in `server/types/` for server-only types.
- **Handle errors explicitly** with proper HTTP status codes and error messages.
- **Use `Bun.sql`** tagged template literals for all database operations.
- **Follow the standard response format** (`{ data, error, meta }`) for all API responses.
- **Create new migration files** for schema changes — use the next sequential number.
- **Use vanilla CSS** for all styling.
- **Write tests FIRST** before implementing any feature (TDD).
- **Run `bun test`** before committing to ensure nothing is broken.
- **Test every route** for correct status codes, response format, validation, and auth.

### ❌ Don't

- **DON'T** use any ORM or query builder (no Prisma, Drizzle, Knex, TypeORM, etc.).
- **DON'T** use the `any` type — use `unknown` and type narrowing instead.
- **DON'T** hardcode secrets or API keys — use environment variables via `.env`.
- **DON'T** modify existing migration files — always create a new migration.
- **DON'T** use Tailwind CSS or any CSS framework — use vanilla CSS only.
- **DON'T** use class components in React — functional components only.
- **DON'T** make direct `fetch()` calls in React components — use the API client.
- **DON'T** use `var` — use `const` or `let`.
- **DON'T** commit `.env` files or API keys to version control.
- **DON'T** use Node.js APIs when Bun equivalents exist (e.g., use `Bun.sql` not `pg`).
- **DON'T** write implementation code without writing a failing test first.
- **DON'T** skip tests — every route, service, and utility must be tested.
- **DON'T** commit code with failing tests.
