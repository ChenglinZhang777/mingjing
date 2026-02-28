import fp from 'fastify-plugin'
import { Prisma } from '@prisma/client'
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { failure } from '../utils/response.js'

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error(error)

    if (error.validation) {
      return reply.status(400).send(failure('VALIDATION_ERROR', '请求参数验证失败'))
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send(failure('CONFLICT', '数据已存在，请检查唯一字段'))
      }
      if (error.code === 'P2025') {
        return reply.status(404).send(failure('NOT_FOUND', '未找到请求的资源'))
      }
    }

    const statusCode = error.statusCode ?? 500
    const message = statusCode === 500 ? '服务器内部错误，请稍后重试' : error.message

    return reply.status(statusCode).send(failure('INTERNAL_ERROR', message))
  })
})
