CREATE TABLE IF NOT EXISTS chat_retrievals (
    chat_id           INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    semantic_index_id INTEGER REFERENCES semantic_index(id) ON DELETE SET NULL,
    similarity        REAL NOT NULL,
    PRIMARY KEY (chat_id, semantic_index_id)
);
