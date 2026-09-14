import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { handleGameMessage, startGame, StartGameSchema } from './gameApi'

const PORT = Number(process.env.PORT ?? 8787)

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  response.end(JSON.stringify(body))
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 20_000) throw new Error('Request body is too large')
  }
  return raw ? JSON.parse(raw) : {}
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {})
  try {
    if (request.method === 'GET' && request.url === '/domovoi/api/health') {
      return sendJson(response, 200, { ok: true })
    }
    if (request.method === 'POST' && request.url === '/domovoi/api/game/start') {
      const input = StartGameSchema.parse(await readBody(request))
      void input
      return sendJson(response, 200, await startGame())
    }
    if (request.method === 'POST' && request.url === '/domovoi/api/game/message') {
      return sendJson(response, 200, await handleGameMessage(await readBody(request)))
    }
    return sendJson(response, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    const status = message === 'Too many requests' ? 429 : message === 'Session not found' ? 404 : 400
    return sendJson(response, status, { error: message })
  }
})

server.listen(PORT, () => {
  console.log(`Domovoi game API listening on http://localhost:${PORT}/domovoi/api/health`)
})
