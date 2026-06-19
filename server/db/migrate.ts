import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from './connection'

export async function runMigrations() {
  try {
    console.log('Creating _migrations table if not exists...')
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    const migrationsDir = join(import.meta.dir, 'migrations')
    let files: string[]
    try {
      files = await readdir(migrationsDir)
    } catch (error) {
      console.error(`Failed to read migrations directory:`, error)
      return false
    }

    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

    for (const file of sqlFiles) {
      const [applied] = await sql`
        SELECT 1 FROM _migrations WHERE name = ${file}
      `
      const isApplied = applied !== undefined

      if (isApplied) {
        console.log(`Skipping already applied migration: ${file}`)
        continue
      }

      console.log(`Applying migration: ${file}`)
      const filePath = join(migrationsDir, file)

      try {
        await sql.begin(async (tx) => {
          await tx.file(filePath)
          await tx`INSERT INTO _migrations (name) VALUES (${file})`
        })
        console.log(`Successfully applied: ${file}`)
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error)
        return false
      }
    }

    console.log('All migrations applied successfully.')
    return true
  } catch (error) {
    console.error('Migration runner failed:', error)
    return false
  }
}

// Only run if this file is the main module
if (import.meta.main) {
  runMigrations().then((success) => {
    if (!success) process.exit(1)
    process.exit(0)
  })
}
