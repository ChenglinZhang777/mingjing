import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { success, paginated, failure } from '../utils/response.js'
import { setupSSE, sendSSEEvent, endSSE } from '../utils/sse.js'
import * as layersService from '../services/layers.service.js'
import * as layersAnalyzer from '../services/layers-analyzer.js'
import { AI_RATE_LIMIT } from '../plugins/rate-limit.js'

interface CreateSessionBody {
  title?: string
}

interface AnalyzeBody {
  sessionId: string
  inputText: string
}

interface HistoryQuery {
  page?: string
  limit?: string
}

export default async function layersRoutes(fastify: FastifyInstance) {
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
    const result = await layersService.createSession(fastify, request.userId, title)
    return success(result)
  })

  fastify.post<{ Body: AnalyzeBody }>('/analyze', {
    config: { rateLimit: AI_RATE_LIMIT },
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'inputText'],
        additionalProperties: false,
        properties: {
          sessionId: { type: 'string', maxLength: 100 },
          inputText: { type: 'string', minLength: 1, maxLength: 10000 },
        },
      },
    },
  }, async (request, reply) => {
    const { sessionId, inputText } = request.body

    const session = await layersService.getSession(fastify, request.userId, sessionId)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }

    setupSSE(reply)

    const abortController = new AbortController()
    request.raw.on('close', () => abortController.abort())

    try {
      const result = await layersAnalyzer.analyze(
        inputText,
        (layer) => {
          if (!abortController.signal.aborted) {
            sendSSEEvent(reply, 'layer', layer)
          }
        },
        () => {
          // onDone handled below
        },
        abortController.signal,
      )

      await layersService.updateSessionResult(
        fastify,
        sessionId,
        inputText,
        result.layers,
        result.suggestions,
      )

      await fastify.prisma.user.update({
        where: { id: request.userId },
        data: { usageCount: { increment: 1 } },
      })

      sendSSEEvent(reply, 'suggestions', { suggestions: result.suggestions })
      sendSSEEvent(reply, 'done', { sessionId, status: 'completed' })
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

    const { sessions, total } = await layersService.getHistory(fastify, request.userId, page, limit)
    return paginated(sessions, page, limit, total)
  })

  fastify.get<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    const session = await layersService.getSession(fastify, request.userId, request.params.id)
    if (!session) {
      return reply.status(404).send(failure('NOT_FOUND', '会话不存在'))
    }
    return success(session)
  })
}
