// Общие помощники для заметок: подпись автора и тексты ошибок.
// Нужны и в списке, и на странице заметки, поэтому лежат отдельно.

import { ApiError } from '../api/client.ts'
import type { Note } from '../api/types.ts'

// Подпись автора. Имён других участников бэкенд не отдаёт — только id.
export function authorLabel(note: Note, currentUserId: number): string {
  if (note.author_id === currentUserId) return 'Вы'
  if (note.author_id === null) return 'Удалённый пользователь'
  return 'Участник'
}

// Текст ошибки при создании и правке. Статусы — из app/api/notes.py и deps.py.
export function noteErrorText(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 422) return 'Заголовок — от 1 до 200 символов, текст — до 50 000.'
    if (error.status === 404) return 'Заметка или пространство недоступны: возможно, их удалили.'
  }
  return 'Не удалось сохранить заметку. Попробуйте ещё раз.'
}
