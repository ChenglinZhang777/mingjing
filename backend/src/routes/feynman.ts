import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { success, paginated, failure } from '../utils/response.js'
import { setupSSE, sendSSEEvent, endSSE } from '../utils/sse.js'
import * as feynmanService from '../services/feynman.service.js'
import * as feynmanAnalyzer from '../services/feynman-analyzer.js'
import { AI_RATE_LIMIT } from '../plugins/rate-limit.js'

interface CreateSessionBody {
  title?: string
}

interface AnalyzeBody {
  sessionId: string
  starStory: string
}

interface HistoryQuery {
  page?: string
  limit?: string
}

export default async function feynmanRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  fastify.post<{ Body: CreateSessionBody }>('/session', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 200 },
        },
      },
    },
  }, async (request) => {
    const { title } = request.body ?? {}
    const result = await feynmanService.createSession(fastify, request.userId, title)
    return success(result)
  })

  fastify.post<{ Body: AnalyzeBody }>('/analyze', {
    config: { rateLimit: AI_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'starStory'],
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', maxLength: 100 },
          starStory: { type: 'string', minLength: 1, maxLength: 10000 },
        },
      },
    },
  }, async (request, reply) => {
    const { sessionId, starStory } = request.body

    const session = await feynmanService.getSession(fastify, request.userId, sessionId)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }

    setupSSE(reply)

    const abortController = new AbortController()
    request.raw.on('close', () => abortController.abort())

    try {
      const result = await feynmanAnalyzer.analyze(starStory, (chunk) => {
        if (!abortController.signal.aborted) {
          sendSSEEvent(reply, 'chunk', { type: 'content', content: chunk })
        }
      }, abortController.signal)

      await feynmanService.updateSessionResult(
        fastify,
        sessionId,
        starStory,
        result,
        result.scores,
      )

      await fastify.prisma.user.update({
        where: { id: request.userId },
        data: { usageCount: { increment: 1 } },
      })

      sendSSEEvent(reply, 'done', { type: 'result', ...result })
    } catch (error) {
      if (abortController.signal.aborted) return
      const message = error instanceof Error ? error.message : '分析失败，请重试'
      sendSSEEvent(reply, 'error', { type: 'error', message })
    }

    endSSE(reply)
  })

  fastify.get<{ Querystring: HistoryQuery }>('/history', async (request) => {
    const page = Math.max(1, Number(request.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10))

    const { sessions, total } = await feynmanService.getHistory(fastify, request.userId, page, limit)
    return paginated(sessions, page, limit, total)
  })

  fastify.get<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    const session = await feynmanService.getSession(fastify, request.userId, request.params.id)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }
    return success(session)
  })
}
