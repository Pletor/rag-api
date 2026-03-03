import { NextResponse } from 'next/server'

export async function GET() {
  // Diagnostika — které env proměnné jsou nastavené
  const envCheck = {
    UPSTASH_VECTOR_REST_URL: !!process.env.UPSTASH_VECTOR_REST_URL,
    UPSTASH_VECTOR_REST_TOKEN: !!process.env.UPSTASH_VECTOR_REST_TOKEN,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    API_SECRET_KEY: !!process.env.API_SECRET_KEY
  }

  return NextResponse.json({ status: 'ok', env: envCheck })
}
