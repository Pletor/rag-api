import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { searchSimilar } from '@/lib/vectorStore'
import type { SearchRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  try {
    const body: SearchRequest = await request.json()

    if (!body.query) {
      return NextResponse.json({ error: 'Chybí query' }, { status: 400 })
    }

    const results = await searchSimilar(
      body.query,
      body.limit ?? 5,
      body.source
    )

    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Search error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
