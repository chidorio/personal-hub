import { Alert, Anchor, Button, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../api/client.ts'
import { useDeleteNote, useNote, useUpdateNote } from '../api/notes.ts'
import { spaceColor, useSpaces } from '../api/spaces.ts'
import { useAuth } from '../auth/context.ts'
import { NoteForm } from '../components/NoteForm.tsx'
import { formatNoteDate } from '../lib/format.ts'
import { authorLabel, noteErrorText } from '../lib/notes.ts'

// Страница заметки: /spaces/:spaceId/notes/:noteId.
// Два режима: просмотр (текст целиком и кнопки) и правка (та же форма, что при создании).
export function NotePage() {
  const params = useParams()
  // Из адреса приходят строки — превращаем в числа один раз.
  const spaceId = Number(params.spaceId)
  const noteId = Number(params.noteId)

  // Все хуки — в начале и без условий: React требует один и тот же порядок
  // при каждой отрисовке, поэтому return с загрузкой и ошибками — только ниже.
  const { state } = useAuth()
  const spaces = useSpaces()
  const note = useNote(spaceId, noteId)
  const updateNote = useUpdateNote(spaceId, noteId)
  const deleteNote = useDeleteNote(spaceId, noteId)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [confirmOpened, confirm] = useDisclosure(false)

  if (spaces.isPending || note.isPending) return <Loader color="ink" />

  const space = spaces.data?.find((item) => item.id === spaceId)
  const backLink = (
    <Anchor component={Link} to={space ? `/spaces/${space.id}` : '/'} size="sm">
      Ко всем заметкам
    </Anchor>
  )

  if (note.isError || !space) {
    const notFound = !space || (note.error instanceof ApiError && note.error.status === 404)
    return (
      <Stack gap="sm" maw={720}>
        {backLink}
        <Title order={2}>{notFound ? 'Заметка не найдена' : 'Не удалось открыть заметку'}</Title>
        <Text c="dimmed">
          {notFound ? 'Возможно, её удалили или у вас нет к ней доступа.' : note.error?.message}
        </Text>
      </Stack>
    )
  }

  if (state.status !== 'authenticated') return null

  const data = note.data
  const color = spaceColor(space.kind)

  // Удаление: после 204 уходим к списку. replace — чтобы «Назад» не вёл
  // на страницу удалённой заметки.
  function handleDelete() {
    deleteNote.mutate(undefined, {
      onSuccess: () => navigate(`/spaces/${spaceId}`, { replace: true }),
    })
  }

  return (
    <Stack gap="lg" maw={720}>
      {backLink}

      {editing ? (
        <NoteForm
          initial={{ title: data.title, body: data.body, pinned: data.pinned }}
          color={color}
          showPinned={false}
          submitLabel="Сохранить"
          pending={updateNote.isPending}
          errorText={updateNote.isError ? noteErrorText(updateNote.error) : null}
          // Отправляем только заголовок и текст: закрепление меняет отдельная кнопка.
          onSubmit={({ title, body }) =>
            updateNote.mutate({ title, body }, { onSuccess: () => setEditing(false) })
          }
          onCancel={() => {
            updateNote.reset()
            setEditing(false)
          }}
        />
      ) : (
        <>
          <Stack gap={6}>
            <Title order={1} style={{ overflowWrap: 'anywhere' }}>
              {data.title}
            </Title>
            <Group gap="sm">
              <Text size="sm" c="dimmed">
                Изменено {formatNoteDate(data.updated_at)}
              </Text>
              {space.kind === 'shared' && (
                <Text size="sm" c="dimmed">
                  Автор: {authorLabel(data, state.user.id)}
                </Text>
              )}
              {data.pinned && (
                <Text size="sm" fw={500} c={`${color}.8`}>
                  Закреплено
                </Text>
              )}
            </Group>
          </Stack>

          <Group gap="sm">
            <Button
              variant="default"
              onClick={() => {
                updateNote.reset()
                setEditing(true)
              }}
            >
              Изменить
            </Button>
            <Button
              variant="default"
              loading={updateNote.isPending}
              onClick={() => updateNote.mutate({ pinned: !data.pinned })}
            >
              {data.pinned ? 'Открепить' : 'Закрепить'}
            </Button>
            <Button variant="subtle" color="red" onClick={confirm.open}>
              Удалить
            </Button>
          </Group>

          {updateNote.isError && (
            <Alert color="red" variant="light" role="alert">
              {noteErrorText(updateNote.error)}
            </Alert>
          )}

          {data.body === '' ? (
            <Text c="dimmed">Текста нет.</Text>
          ) : (
            // pre-wrap — сохранить переносы и пробелы как написано; anywhere — длинные ссылки не ломают ширину.
            <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{data.body}</Text>
          )}
        </>
      )}

      <Modal opened={confirmOpened} onClose={confirm.close} title="Удалить заметку?" centered>
        <Stack gap="md">
          <Text>«{data.title}» будет удалена. Восстановить её не получится.</Text>
          {deleteNote.isError && (
            <Alert color="red" variant="light" role="alert">
              Не удалось удалить заметку. Попробуйте ещё раз.
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={confirm.close}>
              Отмена
            </Button>
            <Button color="red" loading={deleteNote.isPending} onClick={handleDelete}>
              Удалить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
