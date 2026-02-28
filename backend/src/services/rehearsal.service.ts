import type { FastifyInstance } from 'fastify'

// 8 rounds × 2 messages/round + 1 initial = 17, cap at 20 for safety
const MAX_MESSAGES = 20

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function createSession(
  fastify: FastifyInstance,
  userId: string,
  scenario: string,
  interviewerStyle: string,
  firstQuestion: string,
) {
  const initialMessages: Message[] = [
    {
      role: 'assistant',
      content: firstQuestion,
      timestamp: new Date().toISOString(),
    },
  ]

  const session = await fastify.prisma.rehearsalSession.create({
    data: {
      userId,
      scenario,
      interviewerStyle,
      messages: JSON.parse(JSON.stringify(initialMessages)),
    },
    select: { id: true, createdAt: true },
  })

  return { sessionId: session.id, firstQuestion, createdAt: session.createdAt }
}

export async function appendMessage(
  fastify: FastifyInstance,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  const session = await fastify.prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    select: { messages: true },
  })

  if (!session) {
    throw Object.assign(new Error('会话不存在'), { statusCode: 404 })
  }

  const messages = session.messages as unknown as Message[]

  if (messages.length >= MAX_MESSAGES) {
    throw Object.assign(new Error('对话轮次已达上限，请结束面试'), { statusCode: 400 })
  }

  const updated = [
    ...messages,
    { role, content, timestamp: new Date().toISOString() },
  ]

  await fastify.prisma.rehearsalSession.update({
    where: { id: sessionId },
    data: { messages: JSON.parse(JSON.stringify(updated)) },
  })
}

export async function getMessages(fastify: FastifyInstance, sessionId: string): Promise<Message[]> {
  const session = await fastify.prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    select: { messages: true },
  })

  if (!session) {
    throw Object.assign(new Error('会话不存在'), { statusCode: 404 })
  }

  return session.messages as unknown as Message[]
}

export async function endSession(
  fastify: FastifyInstance,
  sessionId: string,
  feedback: unknown,
) {
  await fastify.prisma.rehearsalSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      feedback: feedback as object,
    },
  })
}

export async function getSession(
  fastify: FastifyInstance,
  userId: string,
  sessionId: string,
) {
  return fastify.prisma.rehearsalSession.findFirst({
    where: { id: sessionId, userId },
  })
}

export async function getHistory(
  fastify: FastifyInstance,
  userId: string,
  page: number,
  limit: number,
) {
  const [sessions, total] = await Promise.all([
    fastify.prisma.rehearsalSession.findMany({
      where: { userId },
      select: {
        id: true,
        scenario: true,
        interviewerStyle: true,
        status: true,
        feedback: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    fastify.prisma.rehearsalSession.count({ where: { userId } }),
  ])

  return { sessions, total }
}
