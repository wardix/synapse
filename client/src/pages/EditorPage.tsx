import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Article } from '../../../shared/types'
import { get, post, put } from '../api/client'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { useToast } from '../hooks/useToast'
import './editor-page.css'

type Tag = { id: number; name: string; slug: string }

export function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch tags
    get<{ data: Tag[] }>('/api/tags')
      .then((res) => setAvailableTags(res.data))
      .catch((err) => console.error('Failed to load tags:', err))

    // If edit mode, load article
    if (id) {
      get<{ data: Article }>(`/api/articles/${id}`)
        .then((res) => {
          setTitle(res.data.title)
          setContent(res.data.content)
          setIsPublished(res.data.is_published)
          if (res.data.tags) {
            setSelectedTags(res.data.tags.map((t) => t.id))
          }
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : 'Failed to load article',
          )
        })
    }
  }, [id])

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }

    setIsSaving(true)
    setError('')

    const payload = {
      title,
      content,
      is_published: isPublished,
      tag_ids: selectedTags,
    }

    try {
      if (id) {
        await put<{ data: Article }>(`/api/articles/${id}`, payload)
      } else {
        await post<{ data: Article }>('/api/articles', payload)
        // Clear local draft since it's saved to server
        localStorage.removeItem('synapse-draft-new')
      }

      addToast('Article saved successfully', 'success')

      // Navigate to article page (could use slug if returned, fallback to id/edit)
      navigate('/articles/new', { replace: true }) // A bit hacky without slug, let's just go home
      if (id) navigate(`/articles/${id}/edit`)
      else navigate('/') // or article page
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save article'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className="editor-page">
      <div className="editor-header">
        <input
          type="text"
          className="editor-title-input"
          placeholder="Article Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="editor-controls">
          <select
            multiple
            className="tags-select"
            value={selectedTags.map(String)}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, (option) =>
                Number(option.value),
              )
              setSelectedTags(options)
            }}
          >
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <label className="publish-toggle">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Publish
          </label>

          <button
            type="button"
            className="save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="editor-split-pane">
        <div className="editor-pane">
          <MarkdownEditor
            value={content}
            onChange={setContent}
            articleId={id}
          />
        </div>
        <div className="preview-pane">
          <h1>{title || 'Untitled'}</h1>
          <hr />
          <MarkdownRenderer content={content || '*Live preview...*'} />
        </div>
      </div>
    </div>
  )
}
