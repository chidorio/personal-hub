import { Alert, Anchor, Loader, Stack, Text, Title } from '@mantine/core'
import { Link, useParams } from 'react-router'

import { spaceColor, useSpaces } from '../api/spaces.ts'

// Страница одного пространства: /spaces/:spaceId. Заметки появятся на шаге 4.4.
export function SpacePage() {
  // useParams достаёт кусок адреса: для /spaces/3 → { spaceId: '3' } (строка!).
  const { spaceId } = useParams()
  const spaces = useSpaces()

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

  const color = spaceColor(space.kind)

  return (
    <Stack gap="lg" maw={720}>
      <Stack gap={4}>
        <Title order={1} c={`${color}.8`}>
          {space.kind === 'personal' ? 'Личное' : space.name}
        </Title>
        <Text c="dimmed">
          {space.kind === 'personal' ? 'Видите только вы.' : 'Видят все участники пространства.'}
        </Text>
      </Stack>
      <Text>Заметок пока нет.</Text>
    </Stack>
  )
}
