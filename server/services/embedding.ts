export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }],
        },
      }),
    })

    if (!response.ok) {
      const status = response.status
      if (status === 429) {
        throw new Error('Rate limit exceeded for Gemini API')
      }
      if (status === 401 || status === 403) {
        throw new Error('Invalid Gemini API Key')
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Gemini API Error (${status}): ${errorText}`)
    }

    const data = await response.json()
    if (!data.embedding || !Array.isArray(data.embedding.values)) {
      throw new Error('Invalid response format from Gemini API')
    }

    return data.embedding.values as number[]
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes('GEMINI_API_KEY') ||
        error.message.includes('Gemini API') ||
        error.message.includes('Rate limit') ||
        error.message.includes('Invalid response')
      ) {
        throw error
      }
      throw new Error(
        `Network error or failure calling Gemini API: ${error.message}`,
      )
    }
    throw new Error('Unknown network error calling Gemini API')
  }
}
