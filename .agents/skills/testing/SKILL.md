---
name: testing
description: How to write tests for Synapse using bun:test with TDD approach
---

# Testing with `bun:test` (TDD)

Synapse uses **Test-Driven Development (TDD)**. Always write tests **before** writing implementation code.

## TDD Cycle

```
1. RED    — Write a failing test for the expected behavior
2. GREEN  — Write the minimum code to make the test pass
3. REFACTOR — Clean up the code while keeping tests green
```

**Repeat for every feature, endpoint, service, and component.**

## Test File Location & Naming

Tests live next to the code they test, with a `.test.ts` / `.test.tsx` suffix:

```
server/
├── routes/
│   ├── articles.ts
│   └── articles.test.ts          # Route tests
├── services/
│   ├── search.ts
│   └── search.test.ts            # Service tests
│
client/src/
├── components/
│   ├── ArticleCard.tsx
│   └── ArticleCard.test.tsx      # Component tests
├── hooks/
│   ├── useAuth.ts
│   └── useAuth.test.ts           # Hook tests
├── utils/
│   ├── markdown.ts
│   └── markdown.test.ts          # Utility tests
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test server/services/search.test.ts

# Run tests matching a pattern
bun test --grep "search"

# Watch mode (re-run on file changes)
bun test --watch
```

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";

describe("ArticleService", () => {
  describe("createArticle", () => {
    it("should create an article and return it with an id", async () => {
      // Arrange
      const input = { title: "Test Article", content: "# Hello" };

      // Act
      const result = await createArticle(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.title).toBe("Test Article");
      expect(result.slug).toBe("test-article");
    });

    it("should return error when title is empty", async () => {
      const input = { title: "", content: "# Hello" };
      expect(() => createArticle(input)).toThrow("Title is required");
    });
  });
});
```

### Testing API Routes (Integration Tests)

Use `app.fetch()` from Hono to test routes without starting a server:

```typescript
import { describe, it, expect } from "bun:test";
import app from "../index";

describe("GET /api/articles", () => {
  it("should return paginated articles", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/articles?page=1&limit=10")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeArray();
    expect(json.meta).toMatchObject({
      page: 1,
      limit: 10,
    });
    expect(json.meta.total).toBeNumber();
  });

  it("should return 404 for non-existent article", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/articles/non-existent-slug")
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBeDefined();
    expect(json.data).toBeNull();
  });
});

describe("POST /api/articles", () => {
  it("should return 401 without auth token", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test", content: "Hello" }),
      })
    );

    expect(res.status).toBe(401);
  });

  it("should return 400 when title is missing", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testToken}`,
        },
        body: JSON.stringify({ content: "Hello" }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("title");
  });
});
```

### Testing Services (Unit Tests)

```typescript
import { describe, it, expect, mock } from "bun:test";
import { generateEmbedding } from "./embedding";

describe("EmbeddingService", () => {
  it("should return a vector with 768 dimensions", async () => {
    const embedding = await generateEmbedding("test sentence");

    expect(embedding).toBeArray();
    expect(embedding.length).toBe(768);
  });

  it("should throw on empty input", async () => {
    expect(() => generateEmbedding("")).toThrow();
  });
});
```

### Mocking

Use `mock()` from `bun:test` to mock dependencies:

```typescript
import { mock } from "bun:test";

// Mock a module
mock.module("../services/embedding", () => ({
  generateEmbedding: mock(() => Promise.resolve(new Array(768).fill(0.1))),
}));

// Mock a function
const mockFn = mock(() => "mocked value");
```

## What to Test

### Backend (Must Test)

| Layer | What to Test | Example |
|---|---|---|
| **Routes** | HTTP status codes, response format, validation, auth | `POST /api/articles` returns 201 |
| **Services** | Business logic, edge cases, error handling | `search()` returns ranked results |
| **Middleware** | Auth validation, error handling | Invalid JWT returns 401 |

### Frontend (Must Test)

| Layer | What to Test | Example |
|---|---|---|
| **Utils** | Pure functions, transformations | `slugify("Hello World")` → `"hello-world"` |
| **Hooks** | State changes, API call triggers | `useSearch` debounces input |

## TDD Workflow Example

When creating a new feature (e.g., "add tag to article"):

```
Step 1: Write test      → server/routes/articles.test.ts
                            it("should add a tag to an article")

Step 2: Run test        → bun test (RED ❌ — test fails)

Step 3: Implement       → server/routes/articles.ts
                            app.post("/:id/tags", ...)

Step 4: Run test        → bun test (GREEN ✅ — test passes)

Step 5: Refactor        → Clean up, extract shared logic

Step 6: Run test        → bun test (GREEN ✅ — still passes)

Step 7: Commit          → git commit -m "feat: add tag to article"
```
