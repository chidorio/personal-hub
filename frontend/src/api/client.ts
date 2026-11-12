// Единая точка для всех запросов к API.
// Здесь живут: access-токен (только в памяти), заголовок Authorization,
// обновление токена через /auth/refresh и повтор запроса при 401.
// Компоненты про токены ничего не знают — просто вызывают apiFetch.

import type { TokenResponse } from './types.ts'

const API_PREFIX = '/api'

// ---------- Access-токен ----------

// Обычная переменная модуля: живёт, пока открыта вкладка.
// Не localStorage — его прочитает любой скрипт на странице (XSS).
// После перезагрузки страницы токена нет: его вернёт /auth/refresh по cookie.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// Что делать, когда сессия закончилась окончательно (refresh тоже вернул 401).
// Назначает AuthProvider: «стань гостем» → RequireAuth отправит на /login.
let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler
}

// ---------- Ошибки ----------

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

// ---------- Обновление токена ----------

// Общий «запрос в полёте». Если refresh уже идёт, все остальные ждут его же,
// а не отправляют свой. Иначе два одновременных refresh придут с одной и той же
// cookie: первый её заменит, второй бэкенд сочтёт повторным использованием
// (reuse detection) и отзовёт всю цепочку — пользователя разлогинит.
let refreshInFlight: Promise<boolean> | null = null

// true — новый access получен и сохранён; false — войти заново.
export function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight === null) {
    refreshInFlight = (async () => {
      try {
        // Тело не нужно: refresh-токен браузер сам приложит из httpOnly-cookie.
        const response = await fetch(API_PREFIX + '/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!response.ok) {
          accessToken = null
          return false
        }
        const body = (await response.json()) as TokenResponse
        accessToken = body.access_token
        return true
      } catch {
        // Сеть недоступна — считаем, что войти не удалось.
        accessToken = null
        return false
      } finally {
        // Запрос закончен — следующий refresh пойдёт уже с новой cookie.
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

// ---------- Запросы ----------

// Один HTTP-запрос с текущим access-токеном.
function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken !== null) {
    // Тот же заголовок, что Swagger ставит после кнопки Authorize.
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return fetch(API_PREFIX + path, {
    ...init,
    headers,
    // Отправлять cookie (refresh-токен) только на свой же адрес.
    credentials: 'same-origin',
  })
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)

  // 401 — access истёк или его нет. Пробуем обновить и повторить один раз.
  // Для /auth/* не повторяем: 401 на /auth/login значит «неверный пароль»,
  // а не «токен истёк».
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      // body у нас — строка JSON, её можно отправить повторно.
      response = await send(path, init)
    } else {
      onSessionExpired?.()
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  // 204 No Content (например, /auth/logout) — тела нет.
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}
