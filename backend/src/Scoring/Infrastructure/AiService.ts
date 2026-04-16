// === src/Scoring/Infrastructure/AiService.ts ===

import Anthropic from '@anthropic-ai/sdk'
import type { IAiService, IAiEvaluationResult } from '#/Scoring/Application/IAiService.js'

const SYSTEM_PROMPT =
  'Jesteś sędzią w polskiej grze słownej "Państwa Miasta". Gracz otrzymuje literę i musi podać odpowiedzi dla różnych kategorii. ' +
  'Twoim zadaniem jest ocena czy odpowiedź gracza jest poprawna dla danej kategorii i zaczyna się od podanej litery. ' +
  'Uwzględniaj polską odmianę przez przypadki — np. "Kraków" i "Krakowa" to ta sama odpowiedź. ' +
  'Akceptuj różne formy gramatyczne tego samego słowa (mianownik, dopełniacz itp.). ' +
  'Odpowiadaj WYŁĄCZNIE obiektem JSON w formacie: {"score": <liczba całkowita 0-100>, "reasoning": "<krótkie uzasadnienie po polsku>"}. ' +
  'Wynik 100 oznacza idealną odpowiedź, 0 oznacza odpowiedź całkowicie niepoprawną lub pustą. ' +
  'Bądź wyrozumiały wobec drobnych literówek jeśli słowo wyraźnie istnieje.'

function isAiResponse(value: unknown): value is { score: number; reasoning: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'score' in value &&
    'reasoning' in value &&
    typeof (value as Record<string, unknown>)['score'] === 'number' &&
    typeof (value as Record<string, unknown>)['reasoning'] === 'string'
  )
}

export class AnthropicAiService implements IAiService {
  private readonly client: Anthropic

  public constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  public async evaluate(
    value: string,
    categoryName: string,
    categoryDescription: string,
    letter: string,
  ): Promise<IAiEvaluationResult> {
    const userPrompt =
      `Kategoria: "${categoryName}" — ${categoryDescription}\n` +
      `Wymagana litera: "${letter}"\n` +
      `Odpowiedź gracza: "${value}"\n\n` +
      'Oceń tę odpowiedź.'

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const parsed = JSON.parse(text) as unknown

      if (isAiResponse(parsed)) {
        const score = Math.max(0, Math.min(100, Math.round(parsed.score)))
        return { score, reasoning: parsed.reasoning }
      }

      return { score: 0, reasoning: 'AI zwróciło nieoczekiwany format odpowiedzi' }
    } catch {
      return { score: 0, reasoning: 'Ocena AI nie powiodła się' }
    }
  }
}
