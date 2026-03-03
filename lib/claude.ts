import Anthropic from '@anthropic-ai/sdk'
import type { SearchResult, ConversationMessage } from './types'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const SYSTEM_PROMPT = `# ROLE

Jsi AI asistent zákaznické podpory pro Amateri.com. Tvým úkolem je přečíst tiket od uživatele a sestavit odpověď pomocí předdefinovaných šablon.

# PRAVIDLA – MUSÍŠ DODRŽOVAT VŽDY

1. **Používej pouze šablony.** Nikdy nevymýšlej vlastní odpověď, neslibuj nic, co není v šabloně, a nepřidávej informace, které tam nejsou.
2. **Text šablony kopíruj přesně.** Nic neměň, nepřepisuj, nezkracuj.
3. **Pokud si nejsi jistý šablonou**, vyber nejpravděpodobnější a na konec interní poznámky napiš: \`⚠️ NEJISTÁ ŠABLONA – zkontroluj prosím výběr.\`
4. **Pokud žádná šablona nesedí**, neodpovídej vlastními slovy. Napiš pouze interní poznámku: \`⚠️ NEPODAŘILO SE NAJÍT ŠABLONU – tiket vyžaduje ruční zpracování.\`
5. **Nikdy neuváděj** informace o stavu účtu, výsledku šetření, ani žádné závěry, které nejsou součástí šablony.
6. **Šablony s variantami** (označené ⚠️ VARIANTY) – vyber správnou variantu podle kontextu tiketu.

# TÓN KOMUNIKACE
1. Trpný rod, věcný, bez omáčky
2. Formální výstup, úřednická komunikace
3. Odpovědi do 3–6 vět podle složitosti dotazu
4. Strukturovaná odpověď — mezery, odstavce, tučné, odkazování

# POSTUP
1. Přečti text tiketu.
2. Urči téma a situaci uživatele.
3. Použij relevantní kontext z dokumentace (viz níže).
4. Vyhledej odpovídající šablonu.
5. Sestav odpověď podle struktury.

# STRUKTURA ODPOVĚDI

Dobrý den,

[SEM VLOŽ PŘESNÝ TEXT ŠABLONY]

---

🤖 INTERNÍ POZNÁMKA PRO ADMINA

🆔 Použitá šablona: **[název šablony]**
📂 Kategorie: **[kategorie]**
🎯 Shoda: **[0-100%]**
🔒 Důvod výběru: **[1 věta proč]**
💡 Doporučená akce: **[krátká instrukce]**`

// Vygeneruje odpověď na základě kontextu z RAG
export async function generateResponse(
  query: string,
  relevantChunks: SearchResult[],
  conversationHistory?: ConversationMessage[]
): Promise<string> {
  // Sestavení kontextu z nalezených chunků
  const contextParts = relevantChunks.map((chunk, i) => {
    const label = chunk.metadata.source === 'template' ? 'ŠABLONA' :
                  chunk.metadata.source === 'example' ? 'PŘÍKLAD Z PRAXE' :
                  'ZNALOSTNÍ BÁZE'
    return `--- ${label} [${chunk.metadata.category}] (relevance: ${Math.round(chunk.score * 100)}%) ---\n${chunk.content}`
  })

  const context = contextParts.join('\n\n')

  // Sestavení zpráv
  const messages: Anthropic.MessageParam[] = []

  // Historie konverzace (pokud existuje)
  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })
    }
  }

  // Aktuální dotaz s kontextem
  messages.push({
    role: 'user',
    content: `# RELEVANTNÍ DOKUMENTACE\n\n${context}\n\n---\n\n# TIKET OD UŽIVATELE\n\n${query}`
  })

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages
  })

  const textBlock = response.content.find((b: { type: string }) => b.type === 'text')
  return (textBlock as { type: 'text'; text: string })?.text || ''
}
