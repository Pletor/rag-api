import { readdir, readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { config } from 'dotenv'
import type { ChunkSource } from '../lib/types'

// Načíst .env z root rag-api/
config({ path: resolve(__dirname, '..', '.env') })

const BASE_DIR = resolve(__dirname, '..', '..')
const API_URL = process.env.API_URL || 'https://helmaradmin.vercel.app'
const API_KEY = process.env.API_SECRET_KEY || ''

interface FilePayload {
  name: string
  content: string
  source: ChunkSource
}

async function collectFiles(dirPath: string, source: ChunkSource): Promise<FilePayload[]> {
  const entries = await readdir(dirPath)
  const mdFiles = entries.filter(f => f.endsWith('.md'))

  console.log(`  Nalezeno ${mdFiles.length} .md souborů`)

  const files: FilePayload[] = []
  for (const fileName of mdFiles) {
    const content = await readFile(join(dirPath, fileName), 'utf-8')
    files.push({ name: fileName, content, source })
    console.log(`    ${fileName} (${content.length} znaků)`)
  }

  return files
}

async function sendToApi(files: FilePayload[], reset: boolean) {
  console.log(`\n📡 Posílám ${files.length} souborů na ${API_URL}/api/ingest...`)

  const response = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ files, reset })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API chyba ${response.status}: ${text}`)
  }

  return await response.json()
}

async function main() {
  const shouldReset = process.argv.includes('--reset')

  console.log('=== Helmar RAG Ingest ===\n')

  if (!API_KEY) {
    console.error('Chybí API_SECRET_KEY v .env souboru!')
    process.exit(1)
  }

  // Načíst soubory
  console.log('📚 Knowledge Base:')
  const knowledgeFiles = await collectFiles(
    join(BASE_DIR, '01_Context-Knowledge-Base'), 'knowledge'
  )

  console.log('\n📝 Šablony:')
  const templateFiles = await collectFiles(
    join(BASE_DIR, '02_Daktela-Template-Base'), 'template'
  )

  const allFiles = [...knowledgeFiles, ...templateFiles]

  // Poslat na API (po dávkách — Vercel má limit 4.5MB na request)
  const BATCH_SIZE = 10
  let totalIngested = 0

  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE)
    const isFirst = i === 0
    const result = await sendToApi(batch, isFirst && shouldReset)
    totalIngested += result.ingested
    console.log(`  Dávka ${Math.floor(i / BATCH_SIZE) + 1}: ${result.ingested} chunků`)
  }

  console.log(`\n✅ Hotovo! Celkem ${totalIngested} chunků naimportováno.`)
}

main().catch(err => {
  console.error('Chyba při ingestu:', err)
  process.exit(1)
})
