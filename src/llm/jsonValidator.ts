import {z} from 'zod'
export const ActorResponseSchema=z.object({tensionDelta:z.number(),suspicionDelta:z.number(),actorId:z.string().min(1),messageText:z.string().min(1)})
export type ActorResponse=z.infer<typeof ActorResponseSchema>
export function parseActorResponse(raw:string):ActorResponse{return ActorResponseSchema.parse(JSON.parse(raw))}
