CREATE TABLE IF NOT EXISTS articles (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(500) NOT NULL,
    slug        VARCHAR(500) UNIQUE NOT NULL,
    content     TEXT NOT NULL,
    excerpt     VARCHAR(1000),
    author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT false,
    view_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles
    USING GIN (to_tsvector('english', title || ' ' || content));
