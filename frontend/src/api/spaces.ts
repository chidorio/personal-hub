// Всё про пространства в одном месте: ключ кэша, запрос и цвет.

import { useQuery } from '@tanstack/react-query'

import { apiFetch } from './client.ts'
import type { Space, SpaceKind } from './types.ts'

// Ключ кэша TanStack Query — «имя полки», на которой лежит ответ GET /spaces.
// Вынесен в константу: на шаге 4.3б после создания пространства скажем
// «полка ['spaces'] устарела» — и список перезапросится сам.
export const spacesKey = ['spaces'] as const

// Хук «дай мои пространства». Его вызывают шапка, главная и страница пространства,
// но запрос на бэк уходит один раз: все трое читают одну полку кэша.
export function useSpaces() {
  return useQuery({
    queryKey: spacesKey,
    queryFn: () => apiFetch<Space[]>('/spaces'),
  })
}

// Цвет пространства из темы (theme.ts): личное — чернила, общее — слива.
export function spaceColor(kind: SpaceKind): 'ink' | 'plum' {
  return kind === 'personal' ? 'ink' : 'plum'
}
