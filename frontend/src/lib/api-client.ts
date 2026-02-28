import type { ApiResult } from '@/types/api'

const BASE_URL = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('token')
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const result = (await response.json()) as ApiResult<T>

  if (!result.success) {
    throw new Error(result.error.message)
  }

  return result.data
}
