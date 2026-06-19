---
name: create-migration
description: How to create a new SQL migration file for Synapse
---

# Creating a SQL Migration

## Location

Migration files live in `server/db/migrations/`.

## Naming Convention

Files must be named `NNN_snake_case.sql` where:
- `NNN` is a **zero-padded sequential number** (e.g., `001`, `012`, `099`)
- The rest is a descriptive `snake_case` name

**Before creating a new migration**, check the existing files to determine the next number:
```bash
ls server/db/migrations/
```

## Rules

1. **Must be idempotent where possible** — use `IF NOT EXISTS` for `CREATE TABLE`, `CREATE INDEX`, `CREATE EXTENSION`, etc.
2. **Always include necessary indexes** alongside the table creation or column addition.
3. **Never modify an existing migration file** — always create a new one.
4. **Use `TIMESTAMPTZ` with `DEFAULT NOW()`** for all timestamp columns.
5. **Use `SERIAL PRIMARY KEY`** for auto-incrementing primary keys.
6. **Foreign keys** should follow the pattern `<singular_table>_id` and include `ON DELETE` behavior.
7. **Index naming**: `idx_<table>_<column>` (e.g., `idx_articles_fts`).

## Example

If the last migration is `008_create_chat_retrievals.sql`, the next file would be:

**`server/db/migrations/009_add_article_word_count.sql`**

```sql
-- Add word_count column to articles table
ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

-- Create index for sorting by word count
CREATE INDEX IF NOT EXISTS idx_articles_word_count
    ON articles (word_count);
```

## Running Migrations

After creating a new migration file, run:
```bash
bun run migrate
```

This executes the migration runner at `server/db/migrate.ts`, which applies all pending migrations in sequential order.

## Existing Migrations Reference

The current migration files are:
| File | Purpose |
|---|---|
| `001_create_users.sql` | Users table |
| `002_create_articles.sql` | Articles table + FTS index |
| `003_create_tags.sql` | Tags table + article_tags junction |
| `004_enable_pgvector.sql` | Enable pgvector extension |
| `005_create_semantic_index.sql` | Semantic index table + HNSW vector index |
| `006_create_article_semantic_index.sql` | Article ↔ semantic_index junction |
| `007_create_chat_messages.sql` | Chat messages table |
| `008_create_chat_retrievals.sql` | Chat retrievals table |
