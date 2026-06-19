CREATE TABLE IF NOT EXISTS chat_messages (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    question    TEXT NOT NULL,
    answer      TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
