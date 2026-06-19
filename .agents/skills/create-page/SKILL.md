---
name: create-page
description: How to create a new React page for Synapse
---

# Creating a React Page

## Location

Page components live in `client/src/pages/`. Use **PascalCase** for filenames with the `.tsx` extension (e.g., `ChatPage.tsx`, `HomePage.tsx`).

## Step-by-Step

### 1. Create the Page Component

Create a new file in `client/src/pages/`:

**`client/src/pages/MyPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../api/client";
import "../styles/my-page.css";

type MyItem = {
  id: number;
  name: string;
  created_at: string;
};

export function MyPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        const response = await apiClient.get<{ data: MyItem[] }>("/api/my-resource");
        setItems(response.data);
      } catch (err) {
        setError("Failed to load items");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  return (
    <div className="my-page">
      <header className="my-page__header">
        <h1>My Page</h1>
      </header>

      <section className="my-page__content">
        {items.map((item) => (
          <div key={item.id} className="my-page__item">
            <span>{item.name}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
```

### 2. Create the CSS File

Create a matching CSS file in `client/src/styles/`:

**`client/src/styles/my-page.css`**

```css
.my-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.my-page__header {
  margin-bottom: 2rem;
}

.my-page__header h1 {
  font-size: 2rem;
  font-weight: 700;
}

.my-page__content {
  display: grid;
  gap: 1rem;
}

.my-page__item {
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
}
```

### 3. Register the Route in `App.tsx`

Add the route to `client/src/App.tsx`:

```tsx
import { MyPage } from "./pages/MyPage";

// Inside Router / Routes:
<Route path="/my-page" element={<MyPage />} />
```

### 4. Add Navigation Link (optional)

Add a link in the `Navbar` component if the page should be accessible from the main navigation:

```tsx
<Link to="/my-page">My Page</Link>
```

## Key Rules

- **One page per file** — each page component lives in its own `.tsx` file.
- **Use hooks** from `client/src/hooks/` for shared logic (auth, search, etc.).
- **Use the API client** from `client/src/api/client.ts` for all data fetching — never use `fetch()` directly.
- **Define types** at the top of the file or import from `shared/types.ts`.
- **Handle loading and error states** — always show appropriate UI for loading and error conditions.
- **Use vanilla CSS** — no Tailwind, no inline styles, no CSS-in-JS.
- **Use CSS variables** from the design system defined in `client/src/index.css` (e.g., `var(--surface-color)`, `var(--border-color)`).

## Existing Pages Reference

| File | Route | Purpose |
|---|---|---|
| `HomePage.tsx` | `/` | Dashboard, recent articles, stats |
| `SearchPage.tsx` | `/search` | Search with toggle mode + filters |
| `ChatPage.tsx` | `/chat` | RAG chat interface |
| `ArticlePage.tsx` | `/articles/:slug` | View article (rendered markdown) |
| `EditorPage.tsx` | `/articles/new`, `/articles/:id/edit` | Create/edit article |
| `SemanticIndexPage.tsx` | `/semantic-index` | Manage semantic index entries |
| `LoginPage.tsx` | `/login` | Login / register |
