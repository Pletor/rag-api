// Typ zdroje v RAG systému
export type ChunkSource = 'knowledge' | 'template' | 'example'

// Chunk dokumentu uložený ve vektorové DB
export interface DocumentChunk {
  id: string
  content: string
  metadata: ChunkMetadata
}

// Metadata přiřazená ke každému chunku
export interface ChunkMetadata {
  source: ChunkSource
  file: string
  section: string
  category: string
  anchor: string
  // Pro příklady z konverzací
  rating?: number
  timestamp?: string
}

// Výsledek vyhledávání z vektorové DB
export interface SearchResult {
  id: string
  score: number
  content: string
  metadata: ChunkMetadata
}

// Request/Response typy pro API
export interface SearchRequest {
  query: string
  source?: ChunkSource
  limit?: number
}

export interface ChatRequest {
  query: string
  conversationHistory?: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'agent'
  content: string
}

export interface LearnRequest {
  query: string
  response: string
  rating: number
  category?: string
}

export interface IngestRequest {
  directory: string
  source: ChunkSource
}
