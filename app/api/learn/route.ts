import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { upsertChunks } from '@/lib/vectorStore'
import type { LearnRequest, DocumentChunk } from '@/lib/types'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  const body: LearnRequest = await request.json()

  if (!body.query || !body.response) {
    return NextResponse.json({ error: 'Chybí query nebo response' }, { status: 400 })
  }

  // Sestavit chunk z konverzačního páru
  const timestamp = new Date().toISOString()
  const chunk: DocumentChunk = {
    id: `example:${Date.now()}`,
    content: `DOTAZ: ${body.query}\n\nODPOVĚĎ: ${body.response}`,
    metadata: {
      source: 'example',
      file: 'conversation',
      section: body.query.slice(0, 80),
      category: body.category || 'auto',
      anchor: '#example',
      rating: body.rating,
      timestamp
    }
  }

  const count = await upsertChunks([chunk])

  return NextResponse.json({ stored: count, id: chunk.id })
}
