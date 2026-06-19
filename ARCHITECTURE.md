# 🧠 Synapse — Architecture Plan

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Bun |
| **Frontend** | Vite + React + TypeScript |
| **Backend** | Hono (on Bun) |
| **Database** | PostgreSQL + pgvector |
| **SQL** | Raw SQL via Bun built-in `Bun.sql` |
| **Embeddings** | Google Gemini Embedding API (`text-embedding-004`) |
| **LLM** | Google Gemini API (`gemini-2.5-flash`) |
| **Auth** | JWT-based (bcrypt + jose) |
| **Styling** | Vanilla CSS (modern, premium design) |

---

## Project Structure

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
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_articles.sql
│   │       ├── 003_create_tags.sql
│   │       ├── 004_enable_pgvector.sql
│   │       ├── 005_create_semantic_index.sql
│   │       ├── 006_create_article_semantic_index.sql
│   │       ├── 007_create_chat_messages.sql
│   │       └── 008_create_chat_retrievals.sql
│   ├── routes/
│   │   ├── auth.ts            # Login, register, JWT
│   │   ├── articles.ts        # CRUD articles
│   │   ├── semantic-index.ts  # CRUD semantic index entries
│   │   ├── search.ts          # Full-text + semantic search
│   │   ├── chat.ts            # RAG chat endpoint
│   │   └── tags.ts            # Tag management
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification middleware
│   │   └── cors.ts            # CORS config
│   ├── services/
│   │   ├── embedding.ts       # Gemini Embedding API client
│   │   ├── llm.ts             # Gemini generative API client
│   │   ├── rag.ts             # RAG pipeline (retrieve + generate)
│   │   ├── search.ts          # Search logic (FTS + vector)
│   │   └── auth.ts            # Password hashing, JWT signing
│   └── types/
│       └── index.ts           # Shared types
│
├── client/                    # Frontend (Vite + React)
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Router + layout
│   │   ├── index.css          # Global styles + design system
│   │   ├── api/
│   │   │   └── client.ts      # Fetch wrapper for API calls
│   │   ├── hooks/
│   │   │   ├── useAuth.ts     # Auth state management
│   │   │   └── useSearch.ts   # Debounced search hook
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Dashboard, recent articles
│   │   │   ├── SearchPage.tsx     # Search with filters
│   │   │   ├── ChatPage.tsx       # RAG chat interface
│   │   │   ├── ArticlePage.tsx    # View article (markdown rendered)
│   │   │   ├── EditorPage.tsx     # Create/edit article
│   │   │   ├── SemanticIndexPage.tsx  # Manage semantic index entries
│   │   │   └── LoginPage.tsx      # Auth page
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TagPill.tsx
│   │   │   └── Editor.tsx         # Markdown editor
│   │   └── utils/
│   │       └── markdown.ts        # Markdown parsing config
│   └── public/
│       └── favicon.svg
│
└── shared/                    # Shared between server & client
    └── types.ts               # API request/response types
```

---

## Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,  -- bcrypt hashed
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE articles (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(500) NOT NULL,
    slug        VARCHAR(500) UNIQUE NOT NULL,
    content     TEXT NOT NULL,           -- Markdown content
    excerpt     VARCHAR(1000),
    author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT false,
    view_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_articles_fts ON articles
    USING GIN (to_tsvector('english', title || ' ' || content));

-- Semantic index table (index untuk semantic search)
CREATE TABLE semantic_index (
    id          SERIAL PRIMARY KEY,
    content     TEXT NOT NULL,              -- Kalimat / informasi
    embedding   vector(768),               -- Gemini text-embedding-004 = 768 dims
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity index (HNSW for fast ANN search)
CREATE INDEX idx_semantic_index_embedding ON semantic_index
    USING hnsw (embedding vector_cosine_ops);

-- Tags table
CREATE TABLE tags (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) UNIQUE NOT NULL,
    slug  VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1'   -- Hex color for UI
);

-- Article-Tag junction table
CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id     INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Article-SemanticIndex junction table (many-to-many)
CREATE TABLE article_semantic_index (
    article_id        INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    semantic_index_id INTEGER REFERENCES semantic_index(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, semantic_index_id)
);

-- Chat messages table (log setiap interaksi RAG)
CREATE TABLE chat_messages (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    question    TEXT NOT NULL,              -- Pertanyaan user
    answer      TEXT,                       -- Jawaban dari LLM
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chat retrievals table (semantic_index entries yang di-retrieve per chat)
CREATE TABLE chat_retrievals (
    chat_id           INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    semantic_index_id INTEGER REFERENCES semantic_index(id) ON DELETE SET NULL,
    similarity        REAL NOT NULL,            -- Cosine similarity score
    PRIMARY KEY (chat_id, semantic_index_id)
);
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user profile |

### Articles
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/articles` | List articles (paginated, filterable) |
| `GET` | `/api/articles/:slug` | Get single article |
| `POST` | `/api/articles` | Create article (embed title → semantic_index) |
| `PUT` | `/api/articles/:id` | Update article (re-embed title jika berubah) |
| `DELETE` | `/api/articles/:id` | Delete article |

### Semantic Index
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/semantic-index` | List entries (paginated) |
| `POST` | `/api/semantic-index` | Add entry (auto-generates embedding) |
| `DELETE` | `/api/semantic-index/:id` | Delete entry |

### Search
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/search?q=...&mode=fts` | Full-text search di articles |
| `GET` | `/api/search?q=...&mode=semantic` | Semantic search di semantic_index |
| `GET` | `/api/search?q=...&mode=hybrid` | Gabungan FTS + semantic (default) |

### Tags
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create tag |
| `PUT` | `/api/tags/:id` | Update tag |
| `DELETE` | `/api/tags/:id` | Delete tag |

### Chat (RAG)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Tanya ke RAG, response streaming |
| `GET` | `/api/chat/history` | List chat history (paginated) |
| `GET` | `/api/chat/:id` | Detail chat + retrieved entries |
| `POST` | `/api/chat/:id/promote` | Promote pertanyaan → semantic_index + link artikel |

---

## Key Features

### 1. Dual Search System
Dua mekanisme search yang independen:

**Full-text search** — keyword matching di tabel `articles`:
```sql
SELECT a.*, ts_rank(to_tsvector('english', a.title || ' ' || a.content), plainto_tsquery($1)) AS fts_rank
FROM articles a
WHERE to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery($1)
ORDER BY fts_rank DESC;
```

**Semantic search** — cari kalimat yang paling mirip secara makna di tabel `semantic_index`:
```sql
SELECT
    si.*,
    1 - (si.embedding <=> $1::vector) AS similarity
FROM semantic_index si
ORDER BY si.embedding <=> $1::vector
LIMIT 20;
```

### 2. Semantic Index
Tabel `semantic_index` adalah index untuk semantic search:
- Setiap entry = satu kalimat/informasi + embedding-nya
- Saat entry dibuat, server otomatis generate embedding via Gemini API
- Bisa diisi secara **manual**, **bulk import**, atau **otomatis dari judul artikel**
- Saat artikel dibuat:
  1. Judul di-embed via Gemini API
  2. Insert ke tabel `semantic_index`
  3. Link ke artikel via `article_semantic_index`
- Saat judul artikel diupdate → entry lama di-update, re-embed
- Entry dari artikel tetap bisa exist mandiri jika artikel dihapus

### 3. Markdown Rendering
- Client-side rendering using `marked` or `markdown-it`
- Syntax highlighting with `shiki`
- Math support via KaTeX
- Mermaid diagram support

### 4. Premium UI Design
- Dark mode by default with glassmorphism elements
- Smooth page transitions
- Animated search with real-time results
- Tag pills with custom colors
- Responsive grid layout for article cards
- Semantic index management page

### 5. RAG (Retrieval-Augmented Generation)
User bisa bertanya dalam bahasa natural, sistem menjawab berdasarkan knowledge base:

```
User: "Bagaimana cara deploy PostgreSQL?"
         │
         ▼
   ┌─────────────────────────────┐
   │  1. EMBED pertanyaan user   │
   │     via Gemini Embedding    │
   └──────────┬──────────────────┘
              ▼
   ┌───────────────────────────────┐
   │  2. RETRIEVE dari            │
   │     semantic_index           │
   │     top-K nearest vectors    │
   └──────────┬────────────────────┘
              ▼
   ┌───────────────────────────────┐
   │  3. FETCH artikel terkait    │
   │     via article_semantic_    │
   │     index                    │
   └──────────┬────────────────────┘
              ▼
   ┌───────────────────────────────┐
   │  4. BUILD context prompt     │
   │     semantic entries +       │
   │     articles                 │
   └──────────┬────────────────────┘
              ▼
   ┌─────────────────────────────┐
   │  5. GENERATE jawaban via    │
   │     Gemini (streaming)      │
   │     + sertakan citations    │
   └──────────┬──────────────────┘
              ▼
   ┌─────────────────────────────┐
   │  6. LOG ke chat_messages    │
   │     + chat_retrievals       │
   └─────────────────────────────┘
```

**Contoh prompt ke LLM:**
```
Kamu adalah asisten knowledge base. Jawab pertanyaan user
berdasarkan konteks berikut. Sertakan referensi artikel jika ada.

## Semantic entries yang relevan:
- "PostgreSQL bisa di-deploy via Docker Compose" (similarity: 0.92)
- "pgvector extension perlu diinstall terpisah" (similarity: 0.87)

## Artikel terkait:
- [Cara Deploy PostgreSQL] — "PostgreSQL adalah database relational..."

## Pertanyaan:
Bagaimana cara deploy PostgreSQL?
```

### 6. RAG Feedback Loop
Saat review chat history, jika retrievals tidak tepat:

```
Review chat history
        │
        ▼
  Retrievals tidak relevan?
        │
        ▼ Ya
  ┌─────────────────────────────────────┐
  │  POST /api/chat/:id/promote         │
  │  { article_ids: [3, 7, 12] }        │
  └──────────┬──────────────────────────┘
             │
             ├─ 1. Ambil question dari chat_messages
             ├─ 2. Embed question via Gemini API
             ├─ 3. INSERT ke tabel semantic_index
             ├─ 4. Link ke artikel yang dipilih
             │    via article_semantic_index
             └─ 5. Next time pertanyaan serupa
                  → retrieve knowledge yang tepat
```

**Contoh:**
- User bertanya: *"Cara setup replication PostgreSQL"*
- RAG retrieve entries yang tidak relevan (similarity rendah)
- Admin review → promote pertanyaan + pilih artikel:
  - Artikel #3: *"PostgreSQL Replication Guide"*
  - Artikel #7: *"High Availability Database"*
- Pertanyaan serupa di masa depan → retrieve knowledge ini → jawaban lebih akurat

> Ini menciptakan **learning loop** — semakin banyak review, semakin akurat RAG.

---

## Implementation Phases

### Phase 1 — Foundation ⚙️
- [x] Project scaffolding (monorepo structure)
- [ ] Database setup (migrations, connection)
- [ ] Hono server with basic middleware (CORS, error handling)
- [ ] Vite + React client bootstrap

### Phase 2 — Core CRUD 📝
- [ ] User auth (register, login, JWT)
- [ ] Article CRUD endpoints
- [ ] Tag management
- [ ] Basic article list + detail pages

### Phase 3 — Search & Intelligence 🔍
- [ ] Gemini Embedding integration
- [ ] Semantic index CRUD (add/list/delete entries)
- [ ] Auto-embedding on entry creation
- [ ] Full-text search di articles
- [ ] Semantic search di semantic_index
- [ ] Hybrid search mode
- [ ] Search filters (by tag, date, author)

### Phase 4 — RAG 🤖
- [ ] Gemini generative API integration
- [ ] RAG pipeline (retrieve → augment → generate)
- [ ] Streaming response via SSE
- [ ] Citation / referensi ke artikel sumber
- [ ] Chat logging (chat_messages + chat_retrievals)
- [ ] Chat history API & detail (lihat pertanyaan + entries yang di-retrieve)
- [ ] Promote endpoint (pertanyaan → semantic_index + link artikel)
- [ ] Chat UI (ChatPage) + review/promote UI

### Phase 5 — UI Polish ✨
- [ ] Premium design system (CSS)
- [ ] Markdown editor with live preview
- [ ] Markdown renderer (syntax highlighting, math, diagrams)
- [ ] Animations & micro-interactions
- [ ] Responsive design

### Phase 6 — Production Ready 🚀
- [ ] Input validation & error handling
- [ ] Rate limiting
- [ ] Pagination optimization
- [ ] Docker Compose (app + PostgreSQL + pgvector)

---

> [!IMPORTANT]
> **Prerequisites**: Kamu perlu PostgreSQL dengan pgvector extension terinstall, dan Gemini API key untuk embedding.

> [!NOTE]
> **Why raw SQL?** Sesuai preferensi kamu — raw SQL via `Bun.sql` memberikan kontrol penuh, performa optimal, dan zero abstraction overhead. Type safety tetap terjaga dengan TypeScript types yang match schema.
