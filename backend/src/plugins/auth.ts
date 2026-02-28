import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'

export default fp(async (fastify: FastifyInstance) => {
  const secret = process.env['JWT_SECRET']
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }

  await fastify.register(fastifyJwt, {
    secret,
    sign: {
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    },
  })
})
