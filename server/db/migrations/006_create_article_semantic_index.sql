CREATE TABLE IF NOT EXISTS article_semantic_index (
    article_id        INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    semantic_index_id INTEGER REFERENCES semantic_index(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, semantic_index_id)
);
