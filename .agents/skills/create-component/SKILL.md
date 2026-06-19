---
name: create-component
description: How to create a new React component for Synapse
---

# Creating a React Component

## Location

Reusable components live in `client/src/components/`. Use **PascalCase** for filenames with the `.tsx` extension (e.g., `ArticleCard.tsx`, `TagPill.tsx`).

## Template

**`client/src/components/MyComponent.tsx`**

```tsx
import "./my-component.css";

type MyComponentProps = {
  title: string;
  description?: string;
  isActive?: boolean;
  onClick?: () => void;
};

export function MyComponent({ title, description, isActive = false, onClick }: MyComponentProps) {
  return (
    <div
      className={`my-component ${isActive ? "my-component--active" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <h3 className="my-component__title">{title}</h3>
      {description && (
        <p className="my-component__description">{description}</p>
      )}
    </div>
  );
}
```

## Corresponding CSS File

Create a matching CSS file in `client/src/components/` (same directory) or `client/src/styles/`:

**`client/src/components/my-component.css`**

```css
.my-component {
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.my-component:hover {
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.my-component--active {
  border-color: var(--accent-color);
  background: var(--surface-active-color);
}

.my-component__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.my-component__description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}
```

## Key Rules

- **Functional components only** — no class components.
- **Define a `Props` type** at the top of the file using `type` (not `interface`).
- **Use named exports** — `export function MyComponent(...)` instead of `export default`.
- **Styles in CSS files** — no inline styles, no Tailwind, no CSS-in-JS.
- **Use BEM-like naming** for CSS classes: `.component`, `.component__element`, `.component--modifier`.
- **Use CSS variables** from the design system in `client/src/index.css`.
- **Keep components focused** — each component should do one thing well.
- **Accept callbacks via props** for events (e.g., `onClick`, `onChange`) — let the parent handle the logic.
- **Use semantic HTML** — buttons for clickable actions, anchors for navigation, etc.
- **Include accessibility attributes** — `role`, `tabIndex`, `aria-label` where appropriate.

## Component with Children Example

```tsx
type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <div className={`card ${className ?? ""}`}>
      {children}
    </div>
  );
}
```

## Existing Components Reference

| File | Purpose |
|---|---|
| `Navbar.tsx` | Top navigation bar |
| `ArticleCard.tsx` | Article preview card |
| `MarkdownRenderer.tsx` | Render markdown content |
| `SearchBar.tsx` | Search input with mode toggle |
| `TagPill.tsx` | Tag badge with custom color |
| `Editor.tsx` | Markdown editor with live preview |
