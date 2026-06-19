---
name: create-route
description: How to create a new Hono API route for Synapse
---

# Creating a Hono API Route

## Location

Route files live in `server/routes/`. Use **kebab-case** for filenames (e.g., `semantic-index.ts`, `chat.ts`).

## Pattern

Every route file follows the same structure:

1. Create a new `Hono` instance
2. Define route handlers
3. Export the router
4. Register in `server/index.ts`

## Step-by-Step

### 1. Create the Route File

Create a new file in `server/routes/` with kebab-case naming:

**`server/routes/my-resource.ts`**

```typescript
import { Hono } from "hono";
import { sql } from "../db/connection";
import { authMiddleware } from "../middleware/auth";

const app = new Hono();

// GET /api/my-resource — List resources (paginated)
app.get("/", async (c) => {
  try {
    const page = Number(c.req.query("page") ?? 1);
    const limit = Number(c.req.query("limit") ?? 20);
    const offset = (page - 1) * limit;

    const [countResult] = await sql`SELECT COUNT(*) as total FROM my_resources`;
    const total = Number(countResult.total);

    const items = await sql`
      SELECT * FROM my_resources
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return c.json({
      data: items,
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error("Failed to list resources:", error);
    return c.json({ data: null, error: "Failed to list resources" }, 500);
  }
});

// GET /api/my-resource/:id — Get single resource
app.get("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const [item] = await sql`SELECT * FROM my_resources WHERE id = ${id}`;

    if (!item) {
      return c.json({ data: null, error: "Resource not found" }, 404);
    }

    return c.json({ data: item });
  } catch (error) {
    console.error("Failed to get resource:", error);
    return c.json({ data: null, error: "Failed to get resource" }, 500);
  }
});

// POST /api/my-resource — Create resource (protected)
app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();

    // Validate input
    if (!body.name) {
      return c.json({ data: null, error: "Name is required" }, 400);
    }

    const [item] = await sql`
      INSERT INTO my_resources (name, created_at)
      VALUES (${body.name}, NOW())
      RETURNING *
    `;

    return c.json({ data: item }, 201);
  } catch (error) {
    console.error("Failed to create resource:", error);
    return c.json({ data: null, error: "Failed to create resource" }, 500);
  }
});

// DELETE /api/my-resource/:id — Delete resource (protected)
app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const [item] = await sql`DELETE FROM my_resources WHERE id = ${id} RETURNING *`;

    if (!item) {
      return c.json({ data: null, error: "Resource not found" }, 404);
    }

    return c.json({ data: item });
  } catch (error) {
    console.error("Failed to delete resource:", error);
    return c.json({ data: null, error: "Failed to delete resource" }, 500);
  }
});

export default app;
```

### 2. Register the Route in `server/index.ts`

```typescript
import myResource from "./routes/my-resource";

// Mount routes
app.route("/api/my-resource", myResource);
```

## Response Format

All routes must return the standard response envelope:

```typescript
// Success (single item)
{ data: T }

// Success (list with pagination)
{ data: T[], meta: { page: number, limit: number, total: number } }

// Error
{ data: null, error: string }
```

## Key Rules

- **Always prefix routes with `/api/`** when registering in `server/index.ts`.
- **Use `authMiddleware`** for protected routes (create, update, delete operations).
- **Always validate input** before performing database operations.
- **Use parameterized queries** (`sql\`...\``) — never interpolate user input into SQL strings.
- **Return appropriate HTTP status codes**: `200` (success), `201` (created), `400` (bad request), `401` (unauthorized), `404` (not found), `500` (server error).
- **Handle errors explicitly** — wrap database operations in try/catch and return meaningful error messages.
- **Log errors** with `console.error()` for server-side debugging.

## Existing Routes Reference

| File | Prefix | Purpose |
|---|---|---|
| `auth.ts` | `/api/auth` | Login, register, JWT |
| `articles.ts` | `/api/articles` | CRUD articles |
| `tags.ts` | `/api/tags` | Tag management |
| `semantic-index.ts` | `/api/semantic-index` | CRUD semantic index entries |
| `search.ts` | `/api/search` | Full-text + semantic search |
| `chat.ts` | `/api/chat` | RAG chat, history, promote |
