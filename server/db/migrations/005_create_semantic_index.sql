CREATE TABLE IF NOT EXISTS semantic_index (
    id          SERIAL PRIMARY KEY,
    content     TEXT NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_semantic_index_embedding ON semantic_index
    USING hnsw (embedding vector_cosine_ops);
