import { Box, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { apiFetch } from '../api/client.ts'

// Служебная страница /status: проверяет, что фронтенд видит API через прокси.

type CheckState = 'loading' | 'ok' | 'error'

// Одна строка проверки: цветная точка + название + итог.
function StatusRow({ label, state, detail }: { label: string; state: CheckState; detail: string }) {
  const color = { loading: 'gray.5', ok: 'teal.7', error: 'red.7' }[state]

  return (
    <Group gap="sm" wrap="nowrap">
      {state === 'loading' ? (
        <Loader size={10} color="gray.5" />
      ) : (
        <Box w={10} h={10} bg={color} style={{ borderRadius: '50%', flexShrink: 0 }} />
      )}
      <Text fw={500} w={120}>
        {label}
      </Text>
      <Text c={state === 'error' ? 'red.7' : 'dimmed'}>{detail}</Text>
    </Group>
  )
}

export function StatusPage() {
  // useQuery сам ведёт состояние запроса: isPending (ещё грузится),
  // isError + error (не получилось), data (готовый ответ). Ключ queryKey —
  // имя записи в кэше: тот же ключ в другом компоненте не вызовет второй запрос.
  const api = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ status: string }>('/health'),
  })
  const db = useQuery({
    queryKey: ['health', 'db'],
    queryFn: () => apiFetch<{ database: string }>('/health/db'),
  })

  // Превращаем состояние запроса в одну из трёх строк для экрана.
  const apiState: CheckState = api.isPending ? 'loading' : api.isError ? 'error' : 'ok'
  const dbState: CheckState = db.isPending ? 'loading' : db.isError ? 'error' : 'ok'

  return (
    <Container size={560} py={96}>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1}>Personal Hub</Title>
          <Text c="dimmed">Заметки на двоих: свои и общие.</Text>
        </Stack>

        <Stack gap="sm">
          <StatusRow
            label="Сервер"
            state={apiState}
            detail={
              apiState === 'loading'
                ? 'Проверяем…'
                : apiState === 'ok'
                  ? 'Отвечает'
                  : 'Не отвечает. Запущен ли бэкенд на порту 8000?'
            }
          />
          <StatusRow
            label="База данных"
            state={dbState}
            detail={
              dbState === 'loading'
                ? 'Проверяем…'
                : dbState === 'ok'
                  ? 'Подключена'
                  : (db.error?.message ?? 'Недоступна')
            }
          />
        </Stack>
      </Stack>
    </Container>
  )
}
