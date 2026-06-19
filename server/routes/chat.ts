import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { sql } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { askRag } from '../services/rag'

export const chatRoute = new Hono()

chatRoute.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<{ question: string }>().catch(() => null)
  if (!body?.question) {
    return c.json({ data: null, error: 'Question is required' }, 400)
  }

  // biome-ignore lint/suspicious/noExplicitAny: auth middleware
  const user = (c.get as any)('user') as { userId: number }

  try {
    const { stream: aiStream, retrievals } = await askRag(body.question)

    return stream(c, async (streamWriter) => {
      // Write headers for SSE
      c.header('Content-Type', 'text/event-stream')
      c.header('Cache-Control', 'no-cache')
      c.header('Connection', 'keep-alive')

      let fullAnswer = ''

      try {
        for await (const chunk of aiStream) {
          fullAnswer += chunk
          // Stream the chunk as JSON to properly encode newlines
          await streamWriter.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        }
      } catch (err) {
        console.error('Error during streaming:', err)
        await streamWriter.write(
          `data: ${JSON.stringify({ error: 'Failed to generate full response' })}\n\n`,
        )
      } finally {
        // Send DONE signal
        await streamWriter.write('data: [DONE]\n\n')

        // Log the message and retrievals asynchronously after stream is done
        try {
          const [insertedMessage] = await sql`
            INSERT INTO chat_messages (user_id, question, answer)
            VALUES (${user.userId}, ${body.question}, ${fullAnswer})
            RETURNING id
          `
          const chatId = Number(insertedMessage.id)

          if (retrievals.length > 0) {
            for (const r of retrievals) {
              await sql`
                INSERT INTO chat_retrievals (chat_id, semantic_index_id, similarity)
                VALUES (${chatId}, ${r.id}, ${r.similarity})
                ON CONFLICT DO NOTHING
              `
            }
          }
        } catch (dbErr) {
          console.error('Failed to log chat message:', dbErr)
        }
      }
    })
  } catch (error: unknown) {
    console.error('RAG Error:', error)
    return c.json(
      {
        data: null,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      500,
    )
  }
})

chatRoute.get('/history', authMiddleware, async (c) => {
  // biome-ignore lint/suspicious/noExplicitAny: auth middleware
  const user = (c.get as any)('user') as { userId: number }

  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20
  const offset = (page - 1) * limit

  try {
    const [countResult] = await sql`
      SELECT COUNT(*) as total 
      FROM chat_messages 
      WHERE user_id = ${user.userId}
    `
    const total = Number(countResult.total)

    const messages = await sql`
      SELECT id, question, 
        CASE 
          WHEN LENGTH(answer) > 200 THEN SUBSTRING(answer, 1, 200) || '...'
          ELSE answer
        END as answer,
        created_at
      FROM chat_messages
      WHERE user_id = ${user.userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return c.json({
      data: messages,
      meta: { page, limit, total },
    })
  } catch (err) {
    console.error('Failed to get chat history:', err)
    return c.json({ data: null, error: 'Failed to fetch chat history' }, 500)
  }
})

chatRoute.get('/:id', authMiddleware, async (c) => {
  // biome-ignore lint/suspicious/noExplicitAny: auth middleware
  const user = (c.get as any)('user') as { userId: number }
  const chatId = Number(c.req.param('id'))

  try {
    const messages = await sql`
      SELECT id, question, answer, created_at
      FROM chat_messages
      WHERE id = ${chatId} AND user_id = ${user.userId}
    `

    if (messages.length === 0) {
      return c.json({ data: null, error: 'Chat message not found' }, 404)
    }

    const retrievals = await sql`
      SELECT 
        cr.semantic_index_id, 
        si.content, 
        cr.similarity as similarity_score,
        a.id as article_id,
        a.title as article_title,
        a.slug as article_slug
      FROM chat_retrievals cr
      JOIN semantic_index si ON si.id = cr.semantic_index_id
      LEFT JOIN article_semantic_index asi ON asi.semantic_index_id = si.id
      LEFT JOIN articles a ON a.id = asi.article_id
      WHERE cr.chat_id = ${chatId}
    `

    // De-duplicate retrievals by semantic_index_id, picking the first article match if multiple
    // The query above can return duplicate retrievals if an entry is linked to multiple articles
    const uniqueRetrievals = []
    const seen = new Set()
    for (const r of retrievals) {
      if (!seen.has(r.semantic_index_id)) {
        seen.add(r.semantic_index_id)
        uniqueRetrievals.push(r)
      }
    }

    return c.json({
      data: {
        ...messages[0],
        retrievals: uniqueRetrievals,
      },
    })
  } catch (err) {
    console.error('Failed to get chat detail:', err)
    return c.json({ data: null, error: 'Failed to fetch chat detail' }, 500)
  }
})
