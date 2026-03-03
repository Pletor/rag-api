import type { DocumentChunk, ChunkSource } from './types'

// Rozseká markdown soubor na chunky podle H2 sekcí
export function chunkMarkdown(
  content: string,
  fileName: string,
  source: ChunkSource
): DocumentChunk[] {
  const category = extractCategory(fileName)
  const lines = content.split('\n')
  const chunks: DocumentChunk[] = []

  let currentSection = ''
  let currentAnchor = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/)

    if (h2Match) {
      // Uložit předchozí sekci (pokud existuje)
      if (currentSection && currentLines.length > 0) {
        chunks.push(buildChunk(currentLines, fileName, source, category, currentSection, currentAnchor))
      }

      currentSection = h2Match[1].trim()
      currentAnchor = toAnchor(currentSection)
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }

  // Uložit poslední sekci
  if (currentLines.length > 0) {
    if (!currentSection) {
      // Soubor bez H2 — celý obsah jako jeden chunk
      currentSection = extractTitle(content) || fileName
      currentAnchor = toAnchor(currentSection)
    }
    chunks.push(buildChunk(currentLines, fileName, source, category, currentSection, currentAnchor))
  }

  return chunks
}

function buildChunk(
  lines: string[],
  fileName: string,
  source: ChunkSource,
  category: string,
  section: string,
  anchor: string
): DocumentChunk {
  const content = lines.join('\n').trim()
  const id = `${source}:${fileName}:${anchor}`

  return {
    id,
    content,
    metadata: { source, file: fileName, section, category, anchor: `#${anchor}` }
  }
}

// Extrahuje kategorii z názvu souboru (001_Aplikace.md → Aplikace)
function extractCategory(fileName: string): string {
  const match = fileName.match(/^\d+_(.+)\.md$/)
  if (match) return match[1].replace(/-/g, ' ')

  return fileName.replace(/\.md$/, '').replace(/-/g, ' ')
}

// Extrahuje H1 nadpis ze souboru
function extractTitle(content: string): string | null {
  const match = content.match(/^# (.+)$/m)
  return match ? match[1].trim() : null
}

// Převede český text na URL anchor (bez diakritiky, lowercase, pomlčky)
function toAnchor(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
