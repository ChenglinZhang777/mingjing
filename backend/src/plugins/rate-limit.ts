import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
})

/**
 * Stricter rate limit config for sensitive routes.
 * Usage: { config: { rateLimit: AUTH_RATE_LIMIT } }
 */
export const AUTH_RATE_LIMIT = {
  max: 10,
  timeWindow: '1 minute',
}

/**
 * Stricter rate limit config for AI-intensive routes.
 * Usage: { config: { rateLimit: AI_RATE_LIMIT } }
 */
export const AI_RATE_LIMIT = {
  max: 20,
  timeWindow: '1 minute',
}
