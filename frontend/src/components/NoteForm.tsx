import { Alert, Button, Checkbox, Group, Stack, Textarea, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'

export type NoteFormValues = { title: string; body: string; pinned: boolean }

type Props = {
  // Начальные значения: пустые для новой заметки, текущие — для правки.
  initial: NoteFormValues
  color: 'ink' | 'plum'
  // Флажок «Закрепить» нужен при создании; при правке закрепление — отдельной кнопкой.
  showPinned: boolean
  submitLabel: string
  pending: boolean
  errorText: string | null
  onSubmit: (values: NoteFormValues) => void
  onCancel: () => void
}

// Поля заметки — общие для создания (NoteComposer) и правки (NotePage).
// Форма сама хранит то, что вводят; наружу отдаёт готовые значения по «Сохранить».
export function NoteForm({ initial, color, showPinned, submitLabel, pending, errorText, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [body, setBody] = useState(initial.body)
  const [pinned, setPinned] = useState(initial.pinned)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ title: title.trim(), body, pinned })
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
          maxRows={20}
          maxLength={50_000}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        {showPinned && (
          <Checkbox
            label="Закрепить сверху"
            color={color}
            checked={pinned}
            onChange={(event) => setPinned(event.currentTarget.checked)}
          />
        )}
        {errorText && (
          <Alert color="red" variant="light" role="alert">
            {errorText}
          </Alert>
        )}
        <Group gap="sm">
          <Button type="submit" color={color} loading={pending} disabled={title.trim() === ''}>
            {submitLabel}
          </Button>
          <Button variant="default" onClick={onCancel}>
            Отмена
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
