import type { FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string }
    user: { userId: string }
  }
}

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError
