import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiFetch, refreshAccessToken, setAccessToken, setOnSessionExpired } from '../api/client.ts'
import type { TokenResponse, User } from '../api/types.ts'
import { AuthContext, type AuthState } from './context.ts'

// Хранит состояние входа и раздаёт его всем компонентам через контекст.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'checking' })

  // Выйти локально: забыть токен и очистить кэш запросов,
  // чтобы данные одного пользователя не увидел следующий.
  const becomeGuest = useCallback(() => {
    setAccessToken(null)
    queryClient.clear()
    setState({ status: 'guest' })
  }, [queryClient])

  // При открытии сайта: есть ли живая refresh-cookie?
  useEffect(() => {
    // StrictMode в разработке запускает эффект дважды. Флаг не даёт
    // первому (отменённому) запуску менять состояние. Сам refresh всё равно
    // уйдёт один раз — повторный вызов дождётся общего запроса в client.ts.
    let cancelled = false

    async function restoreSession() {
      const refreshed = await refreshAccessToken()
      if (cancelled) return
      if (!refreshed) {
        setState({ status: 'guest' })
        return
      }
      try {
        const user = await apiFetch<User>('/users/me')
        if (!cancelled) setState({ status: 'authenticated', user })
      } catch {
        if (!cancelled) setState({ status: 'guest' })
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  // client.ts сообщит сюда, когда и refresh вернул 401.
  useEffect(() => {
    setOnSessionExpired(becomeGuest)
    return () => setOnSessionExpired(null)
  }, [becomeGuest])

  const login = useCallback(async (email: string, password: string) => {
    // Ответ: access в теле, refresh — в Set-Cookie (браузер сохранит сам).
    const tokens = await apiFetch<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(tokens.access_token)
    const user = await apiFetch<User>('/users/me')
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      // Бэкенд отзовёт refresh-токен и удалит cookie.
      await apiFetch<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Даже если сервер недоступен — на этом устройстве выходим всё равно.
    } finally {
      becomeGuest()
    }
  }, [becomeGuest])

  // useMemo: новый объект только при смене состояния, иначе все потребители
  // контекста перерисовывались бы на каждый рендер AuthProvider.
  const value = useMemo(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
