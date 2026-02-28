import Fastify from 'fastify'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import corsPlugin from './plugins/cors.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import authRoutes from './routes/auth.js'
import feynmanRoutes from './routes/feynman.js'
import layersRoutes from './routes/layers.js'
import rehearsalRoutes from './routes/rehearsal.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
  })

  // Plugins
  await fastify.register(corsPlugin)
  await fastify.register(rateLimitPlugin)
  await fastify.register(prismaPlugin)
  await fastify.register(authPlugin)
  await fastify.register(errorHandlerPlugin)

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  await fastify.register(feynmanRoutes, { prefix: '/api/v1/feynman' })
  await fastify.register(layersRoutes, { prefix: '/api/v1/layers' })
  await fastify.register(rehearsalRoutes, { prefix: '/api/v1/rehearsal' })

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok' }
  })

  return fastify
}
