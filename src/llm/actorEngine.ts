import { RESIDENT_PROFILES } from '../data/residentProfiles'

export type NpcPersonality = {
  id: string
  name: string
  archetype: string
  speechProfile: {
    capsLockProbability: number
    typoRate: number
    punctuationStyle: 'multiple_dots' | 'excessive_exclamation' | 'no_punctuation' | 'formal'
    favoritePhrases: string[]
  }
  currentAttitudeToPlayer: number
}

const punctuationByStyle: Record<string, NpcPersonality['speechProfile']['punctuationStyle']> = {
  formal: 'formal',
  'нижний регистр, мемы, без точек': 'no_punctuation',
  'коротко, много восклицаний': 'excessive_exclamation',
}

const backendIdByResidentId: Record<string, string> = {
  sergey: 'sergey_drill',
  natalya: 'natalya_activist',
}

export const NPC_PROFILES: Record<string, NpcPersonality> = Object.fromEntries(
  RESIDENT_PROFILES.map((resident) => {
    const id = backendIdByResidentId[resident.id] ?? resident.id
    const punctuationStyle = punctuationByStyle[resident.writingStyle] ?? (
      resident.traits.some((trait) => trait === 'вспыльчивый' || trait === 'нетерпеливый')
        ? 'excessive_exclamation'
        : resident.traits.some((trait) => trait === 'строгая' || trait === 'властная')
          ? 'multiple_dots'
          : 'formal'
    )
    return [id, {
      id,
      name: `${resident.name} (${resident.apartment})`,
      archetype: resident.role,
      speechProfile: {
        capsLockProbability: resident.traits.some((trait) => trait === 'властная' || trait === 'вспыльчивый') ? 0.14 : 0.04,
        typoRate: resident.writingStyle.includes('опечатками') ? 0.12 : 0.04,
        punctuationStyle,
        favoritePhrases: resident.favoriteTopics.slice(0, 2),
      },
      currentAttitudeToPlayer: resident.attitudeToPlayer,
    }] as const
  }),
)

NPC_PROFILES.admin = {
  id: 'admin',
  name: 'Администратор чата',
  archetype: 'уставший администратор',
  speechProfile: {
    capsLockProbability: 0.03,
    typoRate: 0.01,
    punctuationStyle: 'formal',
    favoritePhrases: ['предупреждение', 'ещё одно — бан'],
  },
  currentAttitudeToPlayer: 0,
}

export function buildActorPrompt(npc: NpcPersonality, directive: string) {
  return `Ты — реальный жилец в домовом чате ВК. Пиши 1–3 коротких предложения, без эссе. Разговорный русский, допускай опечатки и скобочки )))). Манера письма: ${npc.speechProfile.punctuationStyle}; любимые темы и фразы: ${npc.speechProfile.favoritePhrases.join(', ')}. Если директива escalate — допускай КАПС. Соблюдай директиву: ${directive}. Персонаж: ${npc.name}, ${npc.archetype}. Только текст сообщения.`
}

export function formatMessage(raw: string, _profile: NpcPersonality) {
  return raw.trim().replace(/^```(?:text)?\s*|\s*```$/gi, '').replace(/^[\"«][\s\S]*?[\"»]$/, '').replace(/^[^:]{1,60}:\s*/, '').trim()
}
