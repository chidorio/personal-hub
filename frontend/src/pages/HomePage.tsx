import { Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'

import { useAuth } from '../auth/context.ts'

// Временная главная шага 4.2: показывает, что вход работает.
// На шаге 4.3 здесь появятся пространства.
export function HomePage() {
  const { state, logout } = useAuth()
  const logoutMutation = useMutation({ mutationFn: logout })

  // Сюда попадают только через RequireAuth, но TypeScript этого не знает.
  if (state.status !== 'authenticated') return null

  return (
    <Container size={560} py={{ base: 48, sm: 96 }}>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={1}>Привет, {state.user.name}</Title>
            <Text c="dimmed">{state.user.email}</Text>
          </Stack>
          <Button variant="default" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
            Выйти
          </Button>
        </Group>
        <Text>Здесь будут ваши пространства: личное и общее.</Text>
      </Stack>
    </Container>
  )
}
