import { sql } from '../db/connection'
import { generateEmbedding } from './embedding'
import { generateStreamingResponse } from './gemini'

export type RagRetrieval = {
  id: number
  content: string
  similarity: number
  article_id: number | null
  article_title: string | null
  article_slug: string | null
}

export async function askRag(question: string) {
  // 1. Embed user question
  const questionEmbedding = await generateEmbedding(question)
  const embeddingString = `[${questionEmbedding.join(',')}]`

  // 2. Retrieve top-K semantic entries
  const entries = await sql<RagRetrieval[]>`
    SELECT
      si.id,
      si.content,
      1 - (si.embedding <=> ${embeddingString}::vector) AS similarity,
      a.id AS article_id,
      a.title AS article_title,
      a.slug AS article_slug,
      a.excerpt AS article_excerpt
    FROM semantic_index si
    LEFT JOIN article_semantic_index asi ON asi.semantic_index_id = si.id
    LEFT JOIN articles a ON a.id = asi.article_id
    ORDER BY si.embedding <=> ${embeddingString}::vector
    LIMIT 5
  `

  // 3. Build context prompt
  let contextPrompt = `Kamu adalah asisten knowledge base. Jawab pertanyaan user
berdasarkan konteks berikut. Sertakan referensi artikel jika ada.\n\n`

  if (entries.length > 0) {
    contextPrompt += `## Semantic entries yang relevan:\n`
    for (const entry of entries) {
      contextPrompt += `- "${entry.content}" (similarity: ${entry.similarity.toFixed(2)})\n`
    }

    // Extract unique articles
    const uniqueArticles = new Map<
      number,
      { title: string; slug: string; excerpt: string }
    >()
    for (const entry of entries) {
      // biome-ignore lint/suspicious/noExplicitAny: complex row
      const a = entry as any
      if (a.article_id && a.article_title && a.article_slug) {
        if (!uniqueArticles.has(a.article_id)) {
          uniqueArticles.set(a.article_id, {
            title: a.article_title,
            slug: a.article_slug,
            excerpt: a.article_excerpt || '',
          })
        }
      }
    }

    if (uniqueArticles.size > 0) {
      contextPrompt += `\n## Artikel terkait:\n`
      for (const article of uniqueArticles.values()) {
        contextPrompt += `- [${article.title}] — "${article.excerpt || article.title}"\n`
      }
    }
  }

  contextPrompt += `\n## Pertanyaan:\n${question}`

  // 4. Return async generator and retrievals so route can log
  return {
    stream: generateStreamingResponse(contextPrompt),
    retrievals: entries,
  }
}
