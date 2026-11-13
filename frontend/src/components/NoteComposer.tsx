import { Alert, Button, Checkbox, Group, Stack, Textarea, TextInput } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState, type FormEvent } from 'react'

import { ApiError } from '../api/client.ts'
import { useCreateNote } from '../api/notes.ts'

function createErrorText(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 422) return 'Заголовок — от 1 до 200 символов, текст — до 50 000.'
    if (error.status === 404) return 'Пространство недоступно: возможно, вас из него удалили.'
  }
  return 'Не удалось сохранить заметку. Попробуйте ещё раз.'
}

// «Новая заметка»: сначала кнопка, по нажатию — форма. После сохранения снова кнопка.
export function NoteComposer({ spaceId, color }: { spaceId: number; color: 'ink' | 'plum' }) {
  const [opened, { open, close }] = useDisclosure(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const createNote = useCreateNote(spaceId)

  // Свернуть и очистить форму.
  function reset() {
    setTitle('')
    setBody('')
    setPinned(false)
    createNote.reset()
    close()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createNote.mutate({ title: title.trim(), body, pinned }, { onSuccess: reset })
  }

  if (!opened) {
    return (
      <Button color={color} onClick={open} style={{ alignSelf: 'flex-start' }}>
        Новая заметка
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label="Заголовок"
          required
          maxLength={200}
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <Textarea
          label="Текст"
          autosize
          minRows={4}
          maxRows={16}
          maxLength={50_000}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        <Checkbox
          label="Закрепить сверху"
          color={color}
          checked={pinned}
          onChange={(event) => setPinned(event.currentTarget.checked)}
        />
        {createNote.isError && (
          <Alert color="red" variant="light" role="alert">
            {createErrorText(createNote.error)}
          </Alert>
        )}
        <Group gap="sm">
          <Button type="submit" color={color} loading={createNote.isPending} disabled={title.trim() === ''}>
            Сохранить
          </Button>
          <Button variant="default" onClick={reset}>
            Отмена
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
