import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { register, login, getMe } from '../services/auth.service.js'
import { success } from '../utils/response.js'
import { AUTH_RATE_LIMIT } from '../plugins/rate-limit.js'

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { email: string; password: string; name: string }
  }>('/register', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          name: { type: 'string', minLength: 1, maxLength: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password, name } = request.body
    const result = await register(fastify, email, name, password)
    return reply.status(201).send(success(result))
  })

  fastify.post<{
    Body: { email: string; password: string }
  }>('/login', {
    config: { rateLimit: AUTH_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 1, maxLength: 128 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body
    const result = await login(fastify, email, password)
    return reply.send(success(result))
  })

  fastify.get('/me', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const user = await getMe(fastify, request.userId)
    return reply.send(success(user))
  })
}
