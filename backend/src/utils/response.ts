export function success<T>(data: T) {
  return { success: true as const, data }
}

export function failure(code: string, message: string, details?: unknown) {
  return { success: false as const, error: { code, message, details } }
}

export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  return {
    success: true as const,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
