import OpenAI from 'openai'
import type { DirectorInput } from './directorEngine'
import { DIRECTOR_SYSTEM_PROMPT, DirectorResponseSchema, type DirectorResponse } from './directorEngine'
import { buildActorPrompt, formatMessage, type NpcPersonality } from './actorEngine'

export const ARIONHUB_BASE_URL = 'https://api.arionhub.pro/v1'
export const DIRECTOR_MODEL = 'china-gpt-5.6-luna'
export const ACTOR_MODEL = 'grok-4.6'

export type DirectorApiResponse = DirectorResponse

export type ArionHubClientOptions = {
  apiKey?: string
  client?: OpenAI
}

function createClient(options: ArionHubClientOptions = {}): OpenAI {
  const apiKey = options.apiKey ?? process.env.ARIONHUB_API_KEY
  if (!apiKey) {
    throw new Error('ARIONHUB_API_KEY is not configured')
  }
  return options.client ?? new OpenAI({ baseURL: ARIONHUB_BASE_URL, apiKey })
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) {
      throw new Error('Director response does not contain a JSON object')
    }
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

function getMessageContent(content: OpenAI.Chat.Completions.ChatCompletion['choices'][number]['message']['content']): string {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('ArionHub returned an empty message')
  }
  return content
}

export async function callDirector(
  context: DirectorInput,
  options: ArionHubClientOptions = {},
): Promise<DirectorResponse> {
  const client = createClient(options)
  const completion = await client.chat.completions.create({
    model: DIRECTOR_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: DIRECTOR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Прими решение по контексту ниже. Верни только JSON по схеме Director: selectedActorId, actionType, targetNpcId, replyToMessageId, tensionDelta, suspicionDelta, actorDirective, recommendedDelayMs.\n${JSON.stringify(context)}`,
      },
    ],
  })
  const content = getMessageContent(completion.choices[0]?.message?.content)
  return DirectorResponseSchema.parse(parseJsonObject(content))
}

export async function callActor(
  npcProfile: NpcPersonality,
  directive: string,
  options: ArionHubClientOptions = {},
): Promise<string> {
  const client = createClient(options)
  const completion = await client.chat.completions.create({
    model: ACTOR_MODEL,
    temperature: 0.85,
    messages: [
      { role: 'system', content: buildActorPrompt(npcProfile, directive) },
      { role: 'user', content: directive },
    ],
  })
  return formatMessage(
    getMessageContent(completion.choices[0]?.message?.content),
    npcProfile,
  )
}
