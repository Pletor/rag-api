import { NextRequest, NextResponse } from 'next/server'

// Ověří API klíč z headeru x-api-key
export function authenticateRequest(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.API_SECRET_KEY

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Neplatný API klíč' }, { status: 401 })
  }

  return null
}
