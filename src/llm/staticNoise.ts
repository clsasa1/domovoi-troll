export type StaticNoise = {
  text: string
  actorId: string
}

export const STATIC_NOISE: StaticNoise[] = [
  { text: '+', actorId: 'natalya_activist' },
  { text: 'а у кого номер сантехника?', actorId: 'sergey_drill' },
  { text: 'опять воду отключили...', actorId: 'ludmila' },
  { text: 'скиньте протокол собрания', actorId: 'natalya_activist' },
]

export function getStaticNoise(random = Math.random): StaticNoise {
  return STATIC_NOISE[Math.floor(random() * STATIC_NOISE.length)] ?? STATIC_NOISE[0]
}
