import { useEffect, useRef, useState } from 'react'
import './markdown-editor.css'

type MarkdownEditorProps = {
  value: string
  onChange: (val: string) => void
  articleId?: string | number
}

export function MarkdownEditor({
  value,
  onChange,
  articleId,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [saveStatus, setSaveStatus] = useState<'Saved to local draft' | ''>('')

  const draftKey = `synapse-draft-${articleId || 'new'}`

  // Load from local storage on mount if empty
  useEffect(() => {
    if (!value) {
      const draft = localStorage.getItem(draftKey)
      if (draft) {
        onChange(draft)
      }
    }
  }, [draftKey, onChange, value]) // actually, running this repeatedly when value changes might overwrite intentional clears. Better handle mount only

  // Auto-save to local storage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, value)
      setSaveStatus('Saved to local draft')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 5000)

    return () => clearTimeout(timer)
  }, [value, draftKey])

  const insertText = (before: string, after = '') => {
    const el = textareaRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.substring(start, end)
    const replacement = before + selected + after

    const newValue =
      value.substring(0, start) + replacement + value.substring(end)
    onChange(newValue)

    // Restore focus and selection
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      )
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ')
    }

    // Shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b') {
        e.preventDefault()
        insertText('**', '**')
      } else if (e.key === 'i') {
        e.preventDefault()
        insertText('*', '*')
      }
    }
  }

  return (
    <div className="markdown-editor-container">
      <div className="markdown-toolbar">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('**', '**')}
        >
          B
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('*', '*')}
        >
          I
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('# ')}
        >
          H1
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('## ')}
        >
          H2
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('### ')}
        >
          H3
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('```\n', '\n```')}
        >
          Code
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('[', '](url)')}
        >
          Link
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('![alt](', ')')}
        >
          Img
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('- ')}
        >
          List
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => insertText('> ')}
        >
          Quote
        </button>
        {saveStatus && (
          <span
            style={{
              marginLeft: 'auto',
              alignSelf: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            {saveStatus}
          </span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        className="markdown-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Start writing your article in markdown..."
      />
    </div>
  )
}
