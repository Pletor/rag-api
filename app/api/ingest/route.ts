import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { chunkMarkdown } from '@/lib/chunker'
import { upsertChunks, resetIndex, getIndexStats } from '@/lib/vectorStore'
import type { ChunkSource } from '@/lib/types'

// Přijímá soubory v requestu (Vercel nemá přístup k lokálnímu disku)
export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  try {
    const body = await request.json()

    // Reset indexu pokud požadováno
    if (body.reset === true) {
      await resetIndex()
    }

    // Očekávaný formát: { files: [{ name: "001_Aplikace.md", content: "...", source: "knowledge" }] }
    if (!body.files || !Array.isArray(body.files)) {
      return NextResponse.json({ error: 'Chybí pole files' }, { status: 400 })
    }

    let totalChunks = 0
    const details: { file: string; chunks: number }[] = []

    for (const file of body.files) {
      const source: ChunkSource = file.source || 'knowledge'
      const chunks = chunkMarkdown(file.content, file.name, source)
      const count = await upsertChunks(chunks)
      totalChunks += count
      details.push({ file: file.name, chunks: count })
    }

    const stats = await getIndexStats()

    return NextResponse.json({ ingested: totalChunks, details, indexStats: stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Ingest error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
