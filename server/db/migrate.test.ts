import { beforeEach, describe, expect, it, mock } from 'bun:test'

process.env.DATABASE_URL = 'postgres://test'

// biome-ignore lint/suspicious/noExplicitAny: mock
const mockSql = mock(async () => []) as any
mockSql.file = mock(async () => {})
// biome-ignore lint/suspicious/noExplicitAny: mock
mockSql.begin = mock(async (cb: any) => {
  // biome-ignore lint/suspicious/noExplicitAny: mock
  const tx = mock(async () => []) as any
  tx.file = mockSql.file
  await cb(tx)
})

mock.module('./connection', () => ({
  sql: mockSql,
}))

import { runMigrations } from './migrate'

describe('Migration Runner', () => {
  beforeEach(() => {
    mockSql.mockClear()
    mockSql.file.mockClear()
    mockSql.begin.mockClear()
  })

  it('should create _migrations table on first run', async () => {
    await runMigrations()
    expect(mockSql).toHaveBeenCalled()
    const firstCall = mockSql.mock.calls[0][0].join('')
    expect(firstCall).toContain('CREATE TABLE IF NOT EXISTS _migrations')
  })

  it('should apply migrations in sequential order', async () => {
    mockSql.mockImplementation(async () => []) // Simulate no migrations applied

    const result = await runMigrations()

    expect(result).toBe(true)
    expect(mockSql.begin).toHaveBeenCalled()
    expect(mockSql.file).toHaveBeenCalled()
  })

  it('should skip already-applied migrations', async () => {
    mockSql.mockImplementation(async (strings) => {
      const query = strings[0]
      // Skip the table creation mock
      if (query?.includes('SELECT 1 FROM _migrations')) {
        return [{ '?column?': 1 }] // Simulate applied
      }
      return []
    })

    const result = await runMigrations()

    expect(result).toBe(true)
    expect(mockSql.begin).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    mockSql.mockImplementationOnce(async () => {
      throw new Error('DB Connection Error')
    })

    const result = await runMigrations()

    expect(result).toBe(false)
  })

  it('should return true on successful run', async () => {
    mockSql.mockImplementation(async () => [])
    const result = await runMigrations()

    expect(result).toBe(true)
  })
})
