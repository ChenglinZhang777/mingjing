import type { FastifyInstance } from 'fastify'

export async function createSession(fastify: FastifyInstance, userId: string, title?: string) {
  const session = await fastify.prisma.feynmanSession.create({
    data: {
      userId,
      title: title ?? null,
      starStory: '',
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
    fastify.prisma.feynmanSession.findMany({
      where: { userId },
      select: { id: true, title: true, scores: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.feynmanSession.count({ where: { userId } }),
  ])

  return { sessions, total }
}

export async function getSession(fastify: FastifyInstance, userId: string, sessionId: string) {
  return fastify.prisma.feynmanSession.findFirst({
    where: { id: sessionId, userId },
  })
}

export async function updateSessionResult(
  fastify: FastifyInstance,
  sessionId: string,
  starStory: string,
  analysisResult: unknown,
  scores: unknown,
) {
  return fastify.prisma.feynmanSession.update({
    where: { id: sessionId },
    data: { starStory, analysisResult: analysisResult as object, scores: scores as object },
  })
}
