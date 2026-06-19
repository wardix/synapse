import type { Tag } from '../../../shared/types'
import './tag-pill.css'

export function TagPill({
  tag,
  onClick,
}: {
  tag: Tag
  onClick?: (tag: Tag) => void
}) {
  const _handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick(tag)
    }
  }

  const bgColor = tag.color || '#6366f1'

  // Simple contrast logic: if color is light, use dark text, else light text
  // Assuming hex colors for simplicity
  const hex = bgColor.replace('#', '')
  const r = Number.parseInt(hex.substr(0, 2), 16)
  const g = Number.parseInt(hex.substr(2, 2), 16)
  const b = Number.parseInt(hex.substr(4, 2), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  const _textColor = yiq >= 128 ? '#0f172a' : '#ffffff'

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role is provided dynamically
    <span
      className={`tag-pill ${onClick ? 'clickable' : ''}`}
      style={{ backgroundColor: bgColor, color: _textColor }}
      onClick={_handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // biome-ignore lint/suspicious/noExplicitAny: event casting
          _handleClick(e as any)
        }
      }}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
    >
      {tag.name}
    </span>
  )
}
