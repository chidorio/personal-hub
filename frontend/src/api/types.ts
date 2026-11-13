// Типы ответов API. Повторяют Pydantic-схемы бэкенда (app/schemas/*.py).
// Это подсказка для TypeScript, а не проверка: если бэкенд поменяет схему,
// тип нужно поправить вручную.

// app/schemas/auth.py → TokenResponse
export type TokenResponse = {
  access_token: string
  token_type: string
}

// app/schemas/user.py → UserRead
export type User = {
  id: number
  email: string
  name: string
  created_at: string // datetime приходит в JSON строкой ISO 8601
}

// app/schemas/space.py → SpaceRead
export type SpaceKind = 'personal' | 'shared'

export type Space = {
  id: number
  name: string
  kind: SpaceKind
  created_at: string
}

// app/schemas/space.py → SpaceMemberRead
export type SpaceMember = {
  user_id: number
  role: 'owner' | 'member'
  joined_at: string
}

// app/schemas/note.py → NoteRead
export type Note = {
  id: number
  space_id: number
  author_id: number | null // null — автор удалён (ON DELETE SET NULL)
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
}

// app/schemas/note.py → NoteCreate
export type NoteCreate = {
  title: string
  body: string
  pinned: boolean
}
