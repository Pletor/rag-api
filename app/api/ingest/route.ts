import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { chunkMarkdown } from '@/lib/chunker'
import { upsertChunks, resetIndex, getIndexStats } from '@/lib/vectorStore'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ChunkSource } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  const body = await request.json()
  const reset = body.reset === true

  // Cesty k dokumentaci (relativní k root projektu)
  const BASE_DIR = join(process.cwd(), '..')
  const KNOWLEDGE_DIR = join(BASE_DIR, '01_Context-Knowledge-Base')
  const TEMPLATE_DIR = join(BASE_DIR, '02_Daktela-Template-Base')

  if (reset) {
    await resetIndex()
  }

  let totalChunks = 0

  // Ingestovat knowledge base
  const knowledgeChunks = await ingestDirectory(KNOWLEDGE_DIR, 'knowledge')
  totalChunks += await upsertChunks(knowledgeChunks)

  // Ingestovat šablony
  const templateChunks = await ingestDirectory(TEMPLATE_DIR, 'template')
  totalChunks += await upsertChunks(templateChunks)

  const stats = await getIndexStats()

  return NextResponse.json({
    ingested: totalChunks,
    knowledgeChunks: knowledgeChunks.length,
    templateChunks: templateChunks.length,
    indexStats: stats
  })
}

async function ingestDirectory(dirPath: string, source: ChunkSource) {
  const files = await readdir(dirPath)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const allChunks = []

  for (const fileName of mdFiles) {
    const content = await readFile(join(dirPath, fileName), 'utf-8')
    const chunks = chunkMarkdown(content, fileName, source)
    allChunks.push(...chunks)
  }

  return allChunks
}
