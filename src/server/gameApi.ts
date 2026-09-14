import { randomUUID } from 'node:crypto'
import { callActor, callDirector } from '../llm/arionhubClient'
import { NPC_PROFILES } from '../llm/actorEngine'
import { type DirectorInput } from '../llm/directorEngine'
import {
  applyDirectorDelta,
  createSessionState,
  generateSessionSummary,
  type ChatLogEntry,
  type SessionState,
} from '../stateEngine'
import { getStaticNoise } from '../llm/staticNoise'
import { z } from 'zod'

export const StartGameSchema = z.object({}).strict()
export const GameMessageSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  replyToMessageId: z.string().nullable().optional(),
  messageType: z.literal('text').default('text'),
}).strict()

export type GameEvent =
  | { type: 'playerMessage'; message: ChatLogEntry }
  | { type: 'typing_start'; actorId: string; delayMs: number }
  | { type: 'npc_message'; actorId: string; text: string; delayMs: number }
  | { type: 'typing_stop'; actorId: string }
  | { type: 'system_event'; event: 'impostor_triggered' | 'player_banned' | 'absolute_chaos'; targetNpcId?: string; text?: string }
  | { type: 'game_over'; status: 'banned' | 'absolute_chaos'; summary: ReturnType<typeof generateSessionSummary> }

export type GameSession = {
  id: string
  state: SessionState
  messages: ChatLogEntry[]
  lastRequestAt: number
}

const sessions = new Map<string, GameSession>()
const MIN_REQUEST_INTERVAL_MS = 500
const APARTMENT_PATTERN = /(?:кв(?:артира)?\.?\s*|из\s+кв\.?\s*)(\d{1,3})/iu

function createSession(): GameSession {
  const id = randomUUID()
  const session: GameSession = {
    id,
    state: createSessionState({ reputationRegistry: Object.fromEntries(Object.keys(NPC_PROFILES).map((id) => [id, 0])) }),
    messages: [],
    lastRequestAt: 0,
  }
  sessions.set(id, session)
  return session
}

function findImpostorNpc(text: string): string | undefined {
  const match = text.match(APARTMENT_PATTERN)
  if (!match) return undefined
  const apartment = Number(match[1])
  const apartments: Record<string, number> = {
    ludmila: 48,
    sergey_drill: 72,
    natalya_activist: 31,
  }
  return Object.entries(apartments).find(([, number]) => number === apartment)?.[0]
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('LLM request timed out')), timeoutMs)),
  ])
}

function baseEvents(session: GameSession, playerMessage: ChatLogEntry): GameEvent[] {
  return [{ type: 'playerMessage', message: playerMessage }]
}

export async function startGame(): Promise<{ sessionId: string; state: SessionState; events: GameEvent[] }> {
  const session = createSession()
  return { sessionId: session.id, state: session.state, events: [] }
}

export async function handleGameMessage(input: unknown): Promise<{ state: SessionState; events: GameEvent[] }> {
  const request = GameMessageSchema.parse(input)
  const session = sessions.get(request.sessionId)
  if (!session) throw new Error('Session not found')
  const now = Date.now()
  if (now - session.lastRequestAt < MIN_REQUEST_INTERVAL_MS) throw new Error('Too many requests')
  session.lastRequestAt = now
  if (session.state.sessionStatus !== 'active') {
    return { state: session.state, events: [{ type: 'game_over', status: session.state.sessionStatus as 'banned' | 'absolute_chaos', summary: generateSessionSummary(session.state) }] }
  }

  const playerMessage: ChatLogEntry = { authorId: 'player', text: request.text, createdAt: now }
  session.messages.push(playerMessage)
  const events = baseEvents(session, playerMessage)
  const impostorNpcId = findImpostorNpc(request.text)
  if (impostorNpcId) {
    const result = applyDirectorDelta(session.state, { tensionDelta: 0, suspicionDelta: 20, now, playerWasActive: true, chatEntry: playerMessage })
    session.state = result.state
    events.push({ type: 'system_event', event: 'impostor_triggered', targetNpcId: impostorNpcId })
  }

  const context: DirectorInput = {
    recentMessages: session.messages.slice(-15).map((message, index) => ({
      id: message.createdAt ? String(message.createdAt) : String(index),
      author: message.authorId,
      text: message.text,
      replyToId: request.replyToMessageId ?? null,
    })),
    currentTension: session.state.tension,
    currentSuspicion: session.state.suspicion,
    activeNpcProfiles: Object.values(NPC_PROFILES).map((profile) => ({
      id: profile.id,
      name: profile.name,
      triggers: profile.speechProfile.favoritePhrases,
      sensitiveTopics: [profile.archetype],
      status: profile.id === 'admin' || profile.id === 'natalya_activist' ? 'online' : 'offline',
    })),
    lastPlayerMessage: request.text,
  }

  let decision
  try {
    decision = await withTimeout(callDirector(context), 12_000)
  } catch {
    const noise = getStaticNoise()
    const noiseMessage: ChatLogEntry = { authorId: noise.actorId, text: noise.text, createdAt: Date.now() }
    session.messages.push(noiseMessage)
    events.push({ type: 'npc_message', actorId: noise.actorId, text: noise.text, delayMs: 1800 })
    return { state: session.state, events }
  }

  const delta = applyDirectorDelta(session.state, {
    tensionDelta: decision.tensionDelta,
    suspicionDelta: decision.suspicionDelta,
    targetNpcId: decision.targetNpcId,
    now,
    playerWasActive: true,
  })
  session.state = delta.state
  if (delta.events.includes('player_banned')) {
    events.push({ type: 'system_event', event: 'player_banned', text: 'Пользователь исключен из беседы' })
  }
  if (delta.events.includes('absolute_chaos')) {
    events.push({ type: 'system_event', event: 'absolute_chaos', text: 'Чат закрыт на сутки из-за спама и угроз участковым' })
  }
  if (session.state.sessionStatus !== 'active') {
    events.push({ type: 'game_over', status: session.state.sessionStatus as 'banned' | 'absolute_chaos', summary: generateSessionSummary(session.state) })
    return { state: session.state, events }
  }
  if (decision.selectedActorId === 'none' || decision.actionType === 'ignore') return { state: session.state, events }

  const npc = NPC_PROFILES[decision.selectedActorId] ?? NPC_PROFILES.admin
  const delayMs = Math.max(1500, Math.min(6000, decision.recommendedDelayMs))
  events.push({ type: 'typing_start', actorId: npc.id, delayMs })
  try {
    const text = await withTimeout(callActor(npc, decision.actorDirective), 12_000)
    const npcMessage: ChatLogEntry = { authorId: npc.id, authorName: npc.name, text, createdAt: Date.now() }
    session.messages.push(npcMessage)
    events.push({ type: 'npc_message', actorId: npc.id, text, delayMs }, { type: 'typing_stop', actorId: npc.id })
  } catch {
    events.push({ type: 'typing_stop', actorId: npc.id })
  }
  return { state: session.state, events }
}
