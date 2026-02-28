import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { success, paginated, failure } from '../utils/response.js'
import { setupSSE, sendSSEEvent, endSSE } from '../utils/sse.js'
import * as rehearsalService from '../services/rehearsal.service.js'
import * as rehearsalInterviewer from '../services/rehearsal-interviewer.js'
import * as rehearsalFeedback from '../services/rehearsal-feedback.js'
import { AI_RATE_LIMIT } from '../plugins/rate-limit.js'

type InterviewerStyle = 'behavioral' | 'technical' | 'stress'

interface CreateSessionBody {
  scenario: string
  interviewerStyle: InterviewerStyle
}

interface MessageBody {
  sessionId: string
  content: string
}

interface HistoryQuery {
  page?: string
  limit?: string
}

export default async function rehearsalRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post<{ Body: CreateSessionBody }>('/session', {
    config: { rateLimit: AI_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['scenario', 'interviewerStyle'],
        additionalProperties: false,
        properties: {
          scenario: { type: 'string', minLength: 1, maxLength: 2000 },
          interviewerStyle: { type: 'string', enum: ['behavioral', 'technical', 'stress'] },
        },
      },
    },
  }, async (request) => {
    const { scenario, interviewerStyle } = request.body

    const firstQuestion = await rehearsalInterviewer.getFirstQuestion(interviewerStyle, scenario)

    const result = await rehearsalService.createSession(
      fastify,
      request.userId,
      scenario,
      interviewerStyle,
      firstQuestion,
    )

    return success(result)
  })

  fastify.post<{ Body: MessageBody }>('/message', {
    config: { rateLimit: AI_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'content'],
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', maxLength: 100 },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
        },
      },
    },
  }, async (request, reply) => {
    const { sessionId, content } = request.body

    const session = await rehearsalService.getSession(fastify, request.userId, sessionId)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }

    if (session.status === 'completed') {
      return reply.status(400).send(failure('SESSION_COMPLETED', '该面试已结束'))
    }

    await rehearsalService.appendMessage(fastify, sessionId, 'user', content)

    const messages = await rehearsalService.getMessages(fastify, sessionId)

    setupSSE(reply)

    const abortController = new AbortController()
    request.raw.on('close', () => abortController.abort())

    try {
      const style = session.interviewerStyle as InterviewerStyle
      const aiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const result = await rehearsalInterviewer.respond(
        style,
        session.scenario,
        aiMessages,
        (chunk) => {
          if (!abortController.signal.aborted) {
            sendSSEEvent(reply, 'chunk', { type: 'content', content: chunk })
          }
        },
        abortController.signal,
      )

      await rehearsalService.appendMessage(fastify, sessionId, 'assistant', result.content)

      const userMessageCount = messages.filter((m) => m.role === 'user').length + 1
      const totalRounds = 8

      if (result.isInterviewEnd) {
        await fastify.prisma.rehearsalSession.update({
          where: { id: sessionId },
          data: { status: 'completed' },
        })
      }

      sendSSEEvent(reply, 'done', {
        type: 'message',
        content: result.content,
        isInterviewEnd: result.isInterviewEnd,
        roundNumber: userMessageCount,
        totalRounds,
      })
    } catch (error) {
      if (abortController.signal.aborted) return
      const message = error instanceof Error ? error.message : '面试官响应失败，请重试'
      sendSSEEvent(reply, 'error', { type: 'error', message })
    }

    endSSE(reply)
  })

  fastify.post<{ Params: { sessionId: string } }>('/end/:sessionId', async (request, reply) => {
    const { sessionId } = request.params

    const session = await rehearsalService.getSession(fastify, request.userId, sessionId)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }

    if (session.status === 'completed' && session.feedback) {
      return success({ feedbackId: sessionId, status: 'already_completed' })
    }

    const messages = await rehearsalService.getMessages(fastify, sessionId)
    const style = session.interviewerStyle as InterviewerStyle

    const feedback = await rehearsalFeedback.generate(
      messages.map((m) => ({ role: m.role, content: m.content })),
      style,
    )

    await rehearsalService.endSession(fastify, sessionId, feedback)

    await fastify.prisma.user.update({
      where: { id: request.userId },
      data: { usageCount: { increment: 1 } },
    })

    return success({ feedbackId: sessionId, status: 'completed' })
  })

  fastify.get<{ Params: { sessionId: string } }>('/feedback/:sessionId', async (request, reply) => {
    const session = await rehearsalService.getSession(fastify, request.userId, request.params.sessionId)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }

    if (!session.feedback) {
      return reply.status(202).send(success({ status: 'generating', message: '反馈正在生成中，请稍后再试' }))
    }

    return success(session.feedback)
  })

  fastify.get<{ Querystring: HistoryQuery }>('/history', async (request) => {
    const page = Math.max(1, Number(request.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10))

    const { sessions, total } = await rehearsalService.getHistory(fastify, request.userId, page, limit)
    return paginated(sessions, page, limit, total)
  })

  fastify.get<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    const session = await rehearsalService.getSession(fastify, request.userId, request.params.id)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }
    return success(session)
  })
}
