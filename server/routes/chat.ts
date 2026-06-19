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
