// Единая точка для всех запросов к API.
// Пока: JSON, ошибки и cookie. На шаге 4.2 сюда добавится access-токен
// в заголовке Authorization и повтор запроса после /auth/refresh при 401.

const API_PREFIX = '/api'

// Ошибка ответа API: статус и текст из поля detail, который отдаёт FastAPI.
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// FastAPI кладёт описание ошибки в detail: строкой (наши HTTPException)
// или списком (ошибки валидации 422). Достаём понятный текст в обоих случаях.
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg
  } catch {
    // тело не JSON — ниже вернём статус
  }
  return `Ошибка ${response.status}`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(API_PREFIX + path, {
    ...init,
    headers,
    // Отправлять cookie (refresh-токен) только на свой же адрес.
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  // 204 No Content (например, /auth/logout) — тела нет.
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}
