import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { config } from 'dotenv'
import { chunkMarkdown } from '../lib/chunker'
import { upsertChunks, resetIndex, getIndexStats } from '../lib/vectorStore'
import type { ChunkSource, DocumentChunk } from '../lib/types'

// Načíst .env z root rag-api/
config({ path: resolve(__dirname, '..', '.env') })

const BASE_DIR = resolve(__dirname, '..', '..')

async function ingestDirectory(dirPath: string, source: ChunkSource): Promise<DocumentChunk[]> {
  const files = await readdir(dirPath)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  console.log(`  Nalezeno ${mdFiles.length} .md souborů v ${dirPath}`)

  const allChunks: DocumentChunk[] = []

  for (const fileName of mdFiles) {
    const content = await readFile(join(dirPath, fileName), 'utf-8')
    const chunks = chunkMarkdown(content, fileName, source)
    console.log(`    ${fileName} → ${chunks.length} chunků`)
    allChunks.push(...chunks)
  }

  return allChunks
}

async function main() {
  const shouldReset = process.argv.includes('--reset')

  console.log('=== Helmar RAG Ingest ===\n')

  if (shouldReset) {
    console.log('Resetuji index...')
    await resetIndex()
    console.log('Index resetován.\n')
  }

  // Knowledge base
  console.log('📚 Ingestuji Knowledge Base...')
  const knowledgePath = join(BASE_DIR, '01_Context-Knowledge-Base')
  const knowledgeChunks = await ingestDirectory(knowledgePath, 'knowledge')
  const knowledgeCount = await upsertChunks(knowledgeChunks)
  console.log(`  Uloženo ${knowledgeCount} chunků.\n`)

  // Templates
  console.log('📝 Ingestuji šablony...')
  const templatePath = join(BASE_DIR, '02_Daktela-Template-Base')
  const templateChunks = await ingestDirectory(templatePath, 'template')
  const templateCount = await upsertChunks(templateChunks)
  console.log(`  Uloženo ${templateCount} chunků.\n`)

  // Statistika
  const stats = await getIndexStats()
  console.log('📊 Statistika indexu:')
  console.log(JSON.stringify(stats, null, 2))

  console.log(`\n✅ Hotovo! Celkem ${knowledgeCount + templateCount} chunků.`)
}

main().catch(err => {
  console.error('Chyba při ingestu:', err)
  process.exit(1)
})
