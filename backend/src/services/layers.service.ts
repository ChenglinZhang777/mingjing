import type { FastifyInstance } from 'fastify'

export async function createSession(fastify: FastifyInstance, userId: string, title?: string) {
  const session = await fastify.prisma.layerAnalysis.create({
    data: {
      userId,
      title: title ?? null,
      inputText: '',
    },
    select: { id: true, createdAt: true },
  })

  return { sessionId: session.id, createdAt: session.createdAt }
}

export async function getHistory(
  fastify: FastifyInstance,
  userId: string,
  page: number,
  limit: number,
) {
  const [sessions, total] = await Promise.all([
    fastify.prisma.layerAnalysis.findMany({
      where: { userId },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.layerAnalysis.count({ where: { userId } }),
  ])

  return { sessions, total }
}

export async function getSession(fastify: FastifyInstance, userId: string, sessionId: string) {
  return fastify.prisma.layerAnalysis.findFirst({
    where: { id: sessionId, userId },
  })
}

export async function updateSessionResult(
  fastify: FastifyInstance,
  sessionId: string,
  inputText: string,
  layers: unknown,
  suggestions: unknown,
) {
  return fastify.prisma.layerAnalysis.update({
    where: { id: sessionId },
    data: {
      inputText,
      layers: layers as object,
      suggestions: suggestions as object,
    },
  })
}
