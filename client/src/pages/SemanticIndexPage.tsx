import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Article } from '../../../shared/types'
import { get } from '../api/client'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useSemanticIndex } from '../hooks/useSemanticIndex'
import { useToast } from '../hooks/useToast'
import './semantic-index-page.css'

export function SemanticIndexPage() {
  const {
    entries,
    isLoading,
    total,
    fetchEntries,
    addEntry,
    deleteEntry,
    bulkDelete,
  } = useSemanticIndex()

  const { addToast } = useToast()

  const [page, setPage] = useState(1)
  const limit = 20

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  // Add form state
  const [newContent, setNewContent] = useState('')
  const [selectedArticles, setSelectedArticles] = useState<number[]>([])
  const [allArticles, setAllArticles] = useState<Article[]>([])
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    fetchEntries(page, limit)
  }, [page, fetchEntries])

  useEffect(() => {
    // Fetch all articles for the dropdown
    get<{ data: Article[] }>('/api/articles?limit=1000')
      .then((res) => setAllArticles(res.data))
      .catch((err) => console.error('Failed to load articles', err))
  }, [])

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries
    return entries.filter((entry) =>
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [entries, searchTerm])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return
    setIsAdding(true)
    try {
      await addEntry(newContent, selectedArticles)
      addToast('Entry added successfully', 'success')
      setNewContent('')
      setSelectedArticles([])
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to add entry',
        'error',
      )
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return
    try {
      await deleteEntry(entryToDelete)
      addToast('Entry deleted successfully', 'success')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(entryToDelete)
        return next
      })
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to delete entry',
        'error',
      )
    }
  }

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return
    try {
      await bulkDelete(Array.from(selectedIds))
      addToast(`${selectedIds.size} entries deleted`, 'success')
      setSelectedIds(new Set())
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Failed to bulk delete',
        'error',
      )
    }
  }

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)))
    }
  }

  return (
    <div className="page-container">
      <div className="si-header">
        <h1>Semantic Index Management</h1>
        <p className="subtitle">
          Manage vectorized knowledge segments and their linked articles.
        </p>
      </div>

      <div className="si-layout">
        <div className="si-sidebar">
          <form
            className="glass-panel add-entry-form"
            onSubmit={handleAddSubmit}
          >
            <h3>Add New Entry</h3>
            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter text to index..."
                rows={5}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="articles">Link to Articles (Optional)</label>
              <select
                id="articles"
                multiple
                value={selectedArticles.map(String)}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions, (o) =>
                    Number(o.value),
                  )
                  setSelectedArticles(options)
                }}
              >
                {allArticles.map((article) => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
              </select>
              <small>Hold Ctrl/Cmd to select multiple</small>
            </div>
            <button type="submit" className="btn-primary" disabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add Entry'}
            </button>
          </form>
        </div>

        <div className="si-main glass-panel">
          <div className="si-toolbar">
            <input
              type="text"
              placeholder="Filter by content..."
              className="si-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {selectedIds.size > 0 && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setIsBulkDeleteModalOpen(true)}
              >
                Delete Selected ({selectedIds.size})
              </button>
            )}
          </div>

          <div className="si-table-wrapper">
            <table className="si-table">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        filteredEntries.length > 0 &&
                        selectedIds.size === filteredEntries.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Content Preview</th>
                  <th>Linked Articles</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && filteredEntries.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="skeleton" style={{ height: '40px' }} />
                      </td>
                    </tr>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                        />
                      </td>
                      <td className="content-cell">
                        {entry.content.length > 80
                          ? `${entry.content.substring(0, 80)}...`
                          : entry.content}
                      </td>
                      <td className="links-cell">
                        {entry.linked_articles &&
                        entry.linked_articles.length > 0 ? (
                          <div className="linked-articles-list">
                            {entry.linked_articles.map((article) => (
                              <Link
                                key={article.id}
                                to={`/articles/${article.slug}`}
                                className="tag-pill link-hover"
                              >
                                {article.title}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-text-danger"
                          onClick={() => setEntryToDelete(entry.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="si-pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={entryToDelete !== null}
        title="Delete Entry"
        message="Are you sure you want to delete this semantic index entry? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setEntryToDelete(null)}
      />

      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        title="Bulk Delete Entries"
        message={`Are you sure you want to delete ${selectedIds.size} selected entries?`}
        confirmText="Delete All"
        isDanger={true}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  )
}
