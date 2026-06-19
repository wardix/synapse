export async function* generateStreamingResponse(
  prompt: string,
): AsyncIterable<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`)
  }

  if (!response.body) {
    throw new Error('No response body from Gemini API')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (textChunk) {
              yield textChunk
            }
          } catch (err) {
            // Ignore parse errors for incomplete JSON or weird chunks
            console.error('Error parsing SSE data chunk:', err)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
