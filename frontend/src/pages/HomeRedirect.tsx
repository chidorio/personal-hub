import { Alert, Loader } from '@mantine/core'
import { Navigate } from 'react-router'

import { useSpaces } from '../api/spaces.ts'

// Адрес «/»: сразу открываем личное пространство.
export function HomeRedirect() {
  const spaces = useSpaces()

  if (spaces.isPending) return <Loader color="ink" />
  if (spaces.isError) {
    return (
      <Alert color="red" variant="light">
        Не удалось загрузить пространства: {spaces.error.message}
      </Alert>
    )
  }

  // Личное создаётся при регистрации, поэтому оно есть всегда; на всякий случай — первое в списке.
  const target = spaces.data.find((space) => space.kind === 'personal') ?? spaces.data[0]
  if (!target) return <Alert variant="light">Пространств пока нет.</Alert>

  // replace: «Назад» не должен возвращать на «/», который снова перекинет вперёд.
  return <Navigate to={`/spaces/${target.id}`} replace />
}
