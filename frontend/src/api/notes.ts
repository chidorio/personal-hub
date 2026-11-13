// Заметки пространства: ключ кэша, список страницами и создание.

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client.ts'
import type { Note, NoteCreate } from './types.ts'

// Сколько заметок за один запрос (на бэкенде limit от 1 до 100).
const PAGE_SIZE = 20

// У каждого пространства своя полка: ['spaces', 94, 'notes'].
// Ключ — функция, потому что в нём есть id пространства.
// Начало ['spaces', 94] общее с другими данными пространства — так позже
// можно будет одной командой сбросить всё, что относится к нему.
export function notesKey(spaceId: number) {
  return ['spaces', spaceId, 'notes'] as const
}

// Список заметок страницами по 20.
// useInfiniteQuery — это useQuery, который хранит не один ответ, а массив страниц:
// data.pages = [[20 заметок], [20 заметок], [7 заметок]].
export function useNotes(spaceId: number) {
  return useInfiniteQuery({
    queryKey: notesKey(spaceId),
    // pageParam — «с какой заметки начать», он же offset для бэкенда.
    queryFn: ({ pageParam }) =>
      apiFetch<Note[]>(`/spaces/${spaceId}/notes?limit=${PAGE_SIZE}&offset=${pageParam}`),
    // Первая страница — с нуля.
    initialPageParam: 0,
    // Есть ли следующая страница и с какого offset она начинается.
    // Пришло меньше 20 — значит, это была последняя: undefined = «дальше нет»,
    // и hasNextPage станет false (кнопка «Показать ещё» спрячется).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  })
}

// Создать заметку: POST /spaces/{id}/notes.
export function useCreateNote(spaceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: NoteCreate) =>
      apiFetch<Note>(`/spaces/${spaceId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
    // Полка заметок этого пространства устарела — список перезапросится сам,
    // и новая заметка встанет на своё место (закреплённые — сверху).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(spaceId) }),
  })
}
