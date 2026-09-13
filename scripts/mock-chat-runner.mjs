const events = [
  { actorId: 'marina', messageText: 'соседи, лифт опять застрял между этажами...', tensionDelta: 8, suspicionDelta: 2 },
  { actorId: 'ilya', messageText: 'у кого-нибудь интернет тоже умер или это только у меня?', tensionDelta: 1, suspicionDelta: 0 },
  { actorId: 'olga', messageText: 'я видела кто мусор мимо контейнера кинул. камеры же стоят.', tensionDelta: 12, suspicionDelta: 7 },
]
let tension = 18
let suspicion = 6
for (const event of events) {
  tension = Math.max(0, Math.min(100, tension + event.tensionDelta))
  suspicion = Math.max(0, Math.min(100, suspicion + event.suspicionDelta))
  console.log(`[${event.actorId}] ${event.messageText}`)
  console.log(`  tension=${tension} suspicion=${suspicion}`)
}
