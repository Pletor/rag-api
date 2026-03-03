import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { searchSimilar } from '@/lib/vectorStore'
import { generateResponse } from '@/lib/claude'
import type { ChatRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  try {
    const body: ChatRequest = await request.json()

    if (!body.query) {
      return NextResponse.json({ error: 'Chybí query' }, { status: 400 })
    }

    const results = await searchSimilar(body.query, 8)

    const response = await generateResponse(
      body.query,
      results,
      body.conversationHistory
    )

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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Chat error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
