import { Index } from '@upstash/vector'
import type { DocumentChunk, SearchResult, ChunkSource } from './types'

// Lazy inicializace
function getIndex() {
  return new Index({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!
  })
}

// Uloží chunky — posílá raw text, Upstash generuje embeddingy interně
export async function upsertChunks(chunks: DocumentChunk[]): Promise<number> {
  if (chunks.length === 0) return 0

  const vectors = chunks.map(chunk => ({
    id: chunk.id,
    data: chunk.content,
    metadata: {
      ...chunk.metadata,
      content: chunk.content
    }
  }))

  const BATCH_SIZE = 50
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE)
    await getIndex().upsert(batch)
  }

  return chunks.length
}

// Semantické vyhledávání — posílá raw text, Upstash generuje embedding query
export async function searchSimilar(
  query: string,
  limit: number = 5,
  sourceFilter?: ChunkSource
): Promise<SearchResult[]> {
  const filter = sourceFilter ? `source = '${sourceFilter}'` : undefined

  const results = await getIndex().query({
    data: query,
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

export async function resetIndex(): Promise<void> {
  await getIndex().reset()
}

export async function getIndexStats() {
  return await getIndex().info()
}
