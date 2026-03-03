import { Index } from '@upstash/vector'
import { generateEmbedding, generateEmbeddings } from './embeddings'
import type { DocumentChunk, SearchResult, ChunkSource, ChunkMetadata } from './types'

// Lazy inicializace — klient se vytvoří až při prvním volání
function getIndex() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!
  })
}

// Uloží chunky do vektorové DB (s embeddingy)
export async function upsertChunks(chunks: DocumentChunk[]): Promise<number> {
  if (chunks.length === 0) return 0

  const texts = chunks.map(c => c.content)
  const embeddings = await generateEmbeddings(texts)

  // Upstash Vector podporuje batch upsert
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    vector: embeddings[i],
    metadata: {
      ...chunk.metadata,
      // Upstash potřebuje content v metadata pro retrieval
      content: chunk.content
    }
  }))

  // Upsert po dávkách (Upstash limit ~1000 za request)
  const BATCH_SIZE = 100
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE)
    await getIndex().upsert(batch)
  }

  return chunks.length
}

// Semantické vyhledávání — vrátí nejrelevantnější chunky
export async function searchSimilar(
  query: string,
  limit: number = 5,
  sourceFilter?: ChunkSource
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query)

  const filter = sourceFilter ? `source = '${sourceFilter}'` : undefined

  const results = await getIndex().query({
    vector: queryEmbedding,
    topK: limit,
    includeMetadata: true,
    filter
  })

  return results.map(r => ({
    id: r.id as string,
    score: r.score,
    content: (r.metadata as Record<string, unknown>)?.content as string || '',
    metadata: {
      source: (r.metadata as Record<string, unknown>)?.source as ChunkSource,
      file: (r.metadata as Record<string, unknown>)?.file as string,
      section: (r.metadata as Record<string, unknown>)?.section as string,
      category: (r.metadata as Record<string, unknown>)?.category as string,
      anchor: (r.metadata as Record<string, unknown>)?.anchor as string,
      rating: (r.metadata as Record<string, unknown>)?.rating as number | undefined,
      timestamp: (r.metadata as Record<string, unknown>)?.timestamp as string | undefined
    }
  }))
}

// Smaže všechny vektory (pro re-ingest)
export async function resetIndex(): Promise<void> {
  await getIndex().reset()
}

// Vrátí statistiku indexu
export async function getIndexStats() {
  return await getIndex().info()
}
