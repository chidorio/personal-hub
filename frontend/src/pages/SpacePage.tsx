import { Alert, Anchor, Divider, Loader, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router'

import { spaceColor, useSpaces } from '../api/spaces.ts'
import { useAuth } from '../auth/context.ts'
import { AddMemberForm } from '../components/AddMemberForm.tsx'
import { NoteComposer } from '../components/NoteComposer.tsx'
import { NoteList } from '../components/NoteList.tsx'

// Страница одного пространства: /spaces/:spaceId — заметки, а в общем ещё и участники.
export function SpacePage() {
  // useParams достаёт кусок адреса: для /spaces/3 → { spaceId: '3' } (строка!).
  const { spaceId } = useParams()
  const spaces = useSpaces()
  const { state } = useAuth()

  if (spaces.isPending) return <Loader color="ink" />
  if (spaces.isError) {
    return (
      <Alert color="red" variant="light">
        Не удалось загрузить пространства: {spaces.error.message}
      </Alert>
    )
  }

  // Ищем в уже загруженном списке: отдельного GET /spaces/{id} на бэкенде нет, и он не нужен.
  const space = spaces.data.find((item) => item.id === Number(spaceId))

  if (!space) {
    // Чужое или несуществующее: бэкенд не отдал его в списке — значит, доступа нет.
    return (
      <Stack gap="sm" maw={720}>
        <Title order={2}>Такого пространства нет</Title>
        <Text c="dimmed">Возможно, ссылка устарела или у вас нет к нему доступа.</Text>
        <Anchor component={Link} to="/">
          К личному пространству
        </Anchor>
      </Stack>
    )
  }

  // Сюда попадают только через RequireAuth, но TypeScript этого не знает.
  if (state.status !== 'authenticated') return null

  const color = spaceColor(space.kind)
  const isShared = space.kind === 'shared'

  return (
    <Stack gap="lg" maw={720}>
      <Stack gap={4}>
        <Title order={1} c={`${color}.8`}>
          {space.kind === 'personal' ? 'Личное' : space.name}
        </Title>
        <Text c="dimmed">{isShared ? 'Видят все участники пространства.' : 'Видите только вы.'}</Text>
      </Stack>

      {/* key={space.id}: при переходе в другое пространство React создаст
          форму заново — недописанная заметка не «переедет» в чужое пространство. */}
      <NoteComposer key={`composer-${space.id}`} spaceId={space.id} color={color} />
      <NoteList spaceId={space.id} color={color} isShared={isShared} currentUserId={state.user.id} />

      {/* Участников добавляют только в общее: в личное бэкенд вернёт 409. */}
      {isShared && (
        <>
          <Divider mt="lg" />
          <AddMemberForm key={`members-${space.id}`} spaceId={space.id} />
        </>
      )}
    </Stack>
  )
}
