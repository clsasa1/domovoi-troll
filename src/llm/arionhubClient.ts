import OpenAI from 'openai'
import { z } from 'zod'
import type { DirectorInput } from './directorEngine'
import { DIRECTOR_SYSTEM_PROMPT } from './directorEngine'
import { buildActorPrompt, formatMessage, type NpcPersonality } from './actorEngine'

export const ARIONHUB_BASE_URL = 'https://api.arionhub.pro/v1'
export const DIRECTOR_MODEL = 'china-gpt-5.6-luna'
export const ACTOR_MODEL = 'grok-4.6'
const DirectorApiResponseSchema = z.object({ tensionDelta: z.number(), suspicionDelta: z.number(), actorId: z.string().min(1), directive: z.string().min(1) })
export type DirectorApiResponse = z.infer<typeof DirectorApiResponseSchema>
export type ArionHubClientOptions = { apiKey?: string; client?: OpenAI }
function createClient(options: ArionHubClientOptions = {}): OpenAI {
  const apiKey = options.apiKey ?? process.env.ARIONHUB_API_KEY
  if (!apiKey) throw new Error('ARIONHUB_API_KEY is not configured')
  return options.client ?? new OpenAI({ baseURL: ARIONHUB_BASE_URL, apiKey })
}
function parseJsonObject(content: string): unknown {
  const trimmed = content.trim()
  try { return JSON.parse(trimmed) } catch {
    const start = trimmed.indexOf('{'); const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) throw new Error('Director response does not contain a JSON object')
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}
function getMessageContent(content: OpenAI.Chat.Completions.ChatCompletion['choices'][number]['message']['content']): string {
  if (typeof content !== 'string' || !content.trim()) throw new Error('ArionHub returned an empty message')
  return content
}
export async function callDirector(context: DirectorInput, options: ArionHubClientOptions = {}): Promise<DirectorApiResponse> {
  const completion = await createClient(options).chat.completions.create({ model: DIRECTOR_MODEL, temperature: 0.2, response_format: { type: 'json_object' }, messages: [
    { role: 'system', content: DIRECTOR_SYSTEM_PROMPT },
    { role: 'user', content: `Прими решение по контексту ниже. Верни только JSON с полями tensionDelta, suspicionDelta, actorId, directive.\n${JSON.stringify(context)}` },
  ]})
  return DirectorApiResponseSchema.parse(parseJsonObject(getMessageContent(completion.choices[0]?.message?.content)))
}
export async function callActor(npcProfile: NpcPersonality, directive: string, options: ArionHubClientOptions = {}): Promise<string> {
  const completion = await createClient(options).chat.completions.create({ model: ACTOR_MODEL, temperature: 0.85, messages: [
    { role: 'system', content: buildActorPrompt(npcProfile, directive) }, { role: 'user', content: directive },
  ]})
  return formatMessage(getMessageContent(completion.choices[0]?.message?.content), npcProfile)
}
