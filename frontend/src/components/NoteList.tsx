import { Alert, Box, Button, Group, Loader, Stack, Text } from '@mantine/core'

import { useNotes } from '../api/notes.ts'
import type { Note } from '../api/types.ts'
import { formatNoteDate } from '../lib/format.ts'

type Props = {
  spaceId: number
  color: 'ink' | 'plum'
  // В общем пространстве показываем, кто автор; в личном автор всегда «вы».
  isShared: boolean
  currentUserId: number
}

// Подпись автора. Имён других участников бэкенд не отдаёт — только id.
function authorLabel(note: Note, currentUserId: number): string {
  if (note.author_id === currentUserId) return 'Вы'
  if (note.author_id === null) return 'Удалённый пользователь'
  return 'Участник'
}

// Одна строка списка. Закреплённая — с полосой слева в цвете пространства.
function NoteRow({ note, color, isShared, currentUserId }: { note: Note } & Omit<Props, 'spaceId'>) {
  return (
    <Box
      component="li"
      py="md"
      pl={note.pinned ? 'sm' : 0}
      style={{
        borderTop: '1px solid var(--mantine-color-gray-3)',
        borderLeft: note.pinned ? `3px solid var(--mantine-color-${color}-8)` : undefined,
      }}
    >
      <Stack gap={4}>
        <Group justify="space-between" align="baseline" wrap="nowrap" gap="md">
          <Text fw={600} lineClamp={1}>
            {note.title}
          </Text>
          <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            {formatNoteDate(note.updated_at)}
          </Text>
        </Group>
        {note.body !== '' && (
          // lineClamp — не больше двух строк, дальше «…». pre-line — сохранить переносы строк.
          <Text size="sm" c="dimmed" lineClamp={2} style={{ whiteSpace: 'pre-line' }}>
            {note.body}
          </Text>
        )}
        {(note.pinned || isShared) && (
          <Group gap="sm">
            {note.pinned && (
              <Text size="xs" fw={500} c={`${color}.8`}>
                Закреплено
              </Text>
            )}
            {isShared && (
              <Text size="xs" c="dimmed">
                {authorLabel(note, currentUserId)}
              </Text>
            )}
          </Group>
        )}
      </Stack>
    </Box>
  )
}

export function NoteList({ spaceId, color, isShared, currentUserId }: Props) {
  const notes = useNotes(spaceId)

  if (notes.isPending) return <Loader color={color} />
  if (notes.isError) {
    return (
      <Alert color="red" variant="light">
        Не удалось загрузить заметки: {notes.error.message}
      </Alert>
    )
  }

  // Склеиваем страницы в один список: [[20], [20], [7]] → [47].
  const items = notes.data.pages.flat()

  if (items.length === 0) {
    return <Text c="dimmed">Заметок пока нет.</Text>
  }

  return (
    <Stack gap="md">
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {items.map((note) => (
          // key — чтобы React понимал, какая строка какая, когда список меняется.
          <NoteRow key={note.id} note={note} color={color} isShared={isShared} currentUserId={currentUserId} />
        ))}
      </Box>

      {notes.hasNextPage && (
        <Button
          variant="default"
          onClick={() => notes.fetchNextPage()}
          loading={notes.isFetchingNextPage}
          style={{ alignSelf: 'flex-start' }}
        >
          Показать ещё
        </Button>
      )}
    </Stack>
  )
}
