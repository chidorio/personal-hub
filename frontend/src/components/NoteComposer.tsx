import { Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'

import { useCreateNote } from '../api/notes.ts'
import { noteErrorText } from '../lib/notes.ts'
import { NoteForm } from './NoteForm.tsx'

const EMPTY = { title: '', body: '', pinned: false }

// «Новая заметка»: сначала кнопка, по нажатию — форма. После сохранения снова кнопка.
export function NoteComposer({ spaceId, color }: { spaceId: number; color: 'ink' | 'plum' }) {
  const [opened, { open, close }] = useDisclosure(false)
  const createNote = useCreateNote(spaceId)

  // Свернуть и забыть старую ошибку. Поля очистятся сами:
  // форма исчезает, а при следующем открытии создаётся заново с EMPTY.
  function reset() {
    createNote.reset()
    close()
  }

  if (!opened) {
    return (
      <Button color={color} onClick={open} style={{ alignSelf: 'flex-start' }}>
        Новая заметка
      </Button>
    )
  }

  return (
    <NoteForm
      initial={EMPTY}
      color={color}
      showPinned
      submitLabel="Сохранить"
      pending={createNote.isPending}
      errorText={createNote.isError ? noteErrorText(createNote.error) : null}
      onSubmit={(values) => createNote.mutate(values, { onSuccess: reset })}
      onCancel={reset}
    />
  )
}
