import { createContext, useContext } from 'react'

import type { User } from '../api/types.ts'

// Три состояния входа:
// checking — при старте ждём ответа /auth/refresh, пока не знаем, кто это;
// guest — не вошёл; authenticated — вошёл, есть данные пользователя.
export type AuthState =
  | { status: 'checking' }
  | { status: 'guest' }
  | { status: 'authenticated'; user: User }

export type AuthContextValue = {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// Контекст — «общая переменная» для всех компонентов внутри AuthProvider.
// Без него состояние входа пришлось бы передавать через props по всей цепочке.
export const AuthContext = createContext<AuthContextValue | null>(null)

// Хук для компонентов: const { state, login, logout } = useAuth()
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth нужно вызывать внутри <AuthProvider>')
  }
  return value
}
