import type { FastifyReply } from 'fastify'

export function setupSSE(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
}

export function sendSSEEvent(reply: FastifyReply, event: string, data: unknown): void {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function endSSE(reply: FastifyReply): void {
  reply.raw.end()
}
