import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { searchSimilar } from '@/lib/vectorStore'
import { generateResponse } from '@/lib/claude'
import type { ChatRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  const body: ChatRequest = await request.json()

  if (!body.query) {
    return NextResponse.json({ error: 'Chybí query' }, { status: 400 })
  }

  // 1. Vyhledat relevantní chunky (knowledge + templates + příklady)
  const results = await searchSimilar(body.query, 8)

  // 2. Vygenerovat odpověď přes Claude
  const response = await generateResponse(
    body.query,
    results,
    body.conversationHistory
  )

  // 3. Vrátit odpověď + zdroje
  return NextResponse.json({
    response,
    sources: results.map(r => ({
      file: r.metadata.file,
      section: r.metadata.section,
      category: r.metadata.category,
      source: r.metadata.source,
      score: r.score
    }))
  })
}
