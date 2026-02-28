import type { FastifyRequest, FastifyReply } from 'fastify'
import { failure } from '../utils/response.js'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<{ userId: string }>()
    request.userId = decoded.userId
  } catch {
    return reply.status(401).send(failure('UNAUTHORIZED', '未授权，请先登录'))
  }
}
