// Всё про пространства в одном месте: ключ кэша, запросы и цвет.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client.ts'
import type { Space, SpaceKind, SpaceMember } from './types.ts'

// Ключ кэша TanStack Query — «подпись на полке», где лежит ответ GET /spaces.
// Вынесен в константу: он нужен и для чтения (useQuery), и для «полка устарела»
// (invalidateQueries) — опечатка в одном из мест сломала бы обновление молча.
export const spacesKey = ['spaces'] as const

// Хук «дай мои пространства». Его вызывают шапка, главная и страница пространства,
// но запрос на бэк уходит один раз: все читают одну полку кэша.
export function useSpaces() {
  return useQuery({
    queryKey: spacesKey,
    queryFn: () => apiFetch<Space[]>('/spaces'),
  })
}

// Создать общее пространство: POST /spaces.
export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<Space>('/spaces', { method: 'POST', body: JSON.stringify({ name }) }),
    // После успеха говорим складу: «полка ['spaces'] устарела».
    // Все useSpaces() на экране сами перезапросят список — новое пространство
    // появится в шапке без перезагрузки. return — чтобы мутация дождалась
    // свежего списка, прежде чем страница перейдёт в новое пространство.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKey }),
  })
}

// Добавить участника по email: POST /spaces/{id}/members.
// Список участников бэкенд пока не отдаёт, поэтому обновлять в кэше нечего.
export function useAddMember(spaceId: number) {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<SpaceMember>(`/spaces/${spaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  })
}

// Цвет пространства из темы (theme.ts): личное — чернила, общее — слива.
export function spaceColor(kind: SpaceKind): 'ink' | 'plum' {
  return kind === 'personal' ? 'ink' : 'plum'
}
