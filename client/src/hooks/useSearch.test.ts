import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useSearch } from './useSearch'

// Mock the API client
mock.module('../api/client', () => ({
  get: mock(async (url: string) => {
    if (url.includes('error')) {
      throw new Error('Search failed')
    }
    return {
      data: {
        mode: url.includes('mode=fts')
          ? 'fts'
          : url.includes('mode=semantic')
            ? 'semantic'
            : 'hybrid',
        results: [{ article: { id: 1, title: 'Result' }, score: 0.9 }],
        total: 1,
      },
    }
  }),
}))

describe('useSearch Hook', () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: mock
    ;(global as any).jest = { advanceTimersByTime: mock(() => {}) }
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSearch())

    expect(result.current.query).toBe('')
    expect(result.current.mode).toBe('hybrid')
    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.total).toBe(0)
    expect(result.current.error).toBe(null)
  })

  it('should not search if query is less than 2 characters', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('a')
    })

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 400))

    expect(result.current.results).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should execute search and update results after debounce', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('test query')
    })

    // Should be loading after timeout starts, wait for it
    await waitFor(
      () => {
        expect(result.current.results.length).toBeGreaterThan(0)
      },
      { timeout: 1000 },
    )

    expect(result.current.total).toBe(1)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should re-execute search when mode changes', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('test')
    })

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    act(() => {
      result.current.setMode('fts')
    })

    await waitFor(() => {
      expect(result.current.mode).toBe('fts')
    })
  })

  it('should handle API errors', async () => {
    const { result } = renderHook(() => useSearch())

    act(() => {
      result.current.setQuery('error trigger')
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Search failed')
    })
    expect(result.current.results).toEqual([])
  })
})
