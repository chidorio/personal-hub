// Заметки пространства: ключ кэша, список страницами и создание.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

// Ключ одной заметки — продолжение ключа списка: ['spaces', 95, 'notes', 12].
// Поэтому invalidateQueries(notesKey(95)) сбросит и список, и открытые заметки:
// он действует на все ключи, которые НАЧИНАЮТСЯ с ['spaces', 95, 'notes'].
export function noteKey(spaceId: number, noteId: number) {
  return [...notesKey(spaceId), noteId] as const
}

// Одна заметка: GET /spaces/{id}/notes/{note_id}.
export function useNote(spaceId: number, noteId: number) {
  return useQuery({
    queryKey: noteKey(spaceId, noteId),
    queryFn: () => apiFetch<Note>(`/spaces/${spaceId}/notes/${noteId}`),
  })
}

// Изменить заметку: PATCH. Бэкенд меняет только присланные поля (exclude_unset),
// поэтому одна функция подходит и для правки текста, и для «Закрепить».
export function useUpdateNote(spaceId: number, noteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changes: Partial<NoteCreate>) =>
      apiFetch<Note>(`/spaces/${spaceId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    // Один вызов по общему началу ключа: открытая заметка перезапросится сразу,
    // список — когда вернёмся к нему. return — дождаться свежих данных.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(spaceId) }),
  })
}

// Удалить заметку: DELETE → 204.
export function useDeleteNote(spaceId: number, noteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/spaces/${spaceId}/notes/${noteId}`, { method: 'DELETE' }),
    // refetchType: 'none' — только пометить список и заметку устаревшими, ничего не
    // перезапрашивать сейчас. Иначе открытая страница успела бы запросить уже
    // удалённую заметку (лишний GET → 404). Список перезапросится сам, когда
    // NotePage уведёт к нему; а если вернуться «Назад» к удалённой заметке —
    // её запрос вернёт 404, и страница покажет «Заметка не найдена».
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKey(spaceId), refetchType: 'none' }),
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
