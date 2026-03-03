import OpenAI from 'openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'

// Lazy inicializace — klient se vytvoří až při prvním volání
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// Vygeneruje embedding pro jeden text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  })

  return response.data[0].embedding
}

// Vygeneruje embeddingy pro více textů najednou (batch)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  // OpenAI API podporuje max 2048 textů v jednom callu
  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const response = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch
    })

    allEmbeddings.push(...response.data.map((d: { embedding: number[] }) => d.embedding))
  }

  return allEmbeddings
}
