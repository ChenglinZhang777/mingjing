import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import { failure } from '../utils/response.js'

const SALT_ROUNDS = 12

export async function register(
  fastify: FastifyInstance,
  email: string,
  name: string,
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await fastify.prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  })

  const token = fastify.jwt.sign({ userId: user.id })

  return { user, token }
}

export async function login(fastify: FastifyInstance, email: string, password: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, createdAt: true },
  })

  if (!user) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401, ...failure('INVALID_CREDENTIALS', '邮箱或密码错误') })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401, ...failure('INVALID_CREDENTIALS', '邮箱或密码错误') })
  }

  const token = fastify.jwt.sign({ userId: user.id })

  const { passwordHash: _, ...userWithoutPassword } = user

  return { user: userWithoutPassword, token }
}

export async function getMe(fastify: FastifyInstance, userId: string) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, usageCount: true, createdAt: true },
  })

  if (!user) {
    throw Object.assign(new Error('用户不存在'), { statusCode: 404, ...failure('NOT_FOUND', '用户不存在') })
  }

  return user
}
