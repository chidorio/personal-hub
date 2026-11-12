import { Anchor, Box, Button, Container, Group, Text } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { Link, Outlet, useLocation } from 'react-router'

import { spaceColor, useSpaces } from '../api/spaces.ts'
import { useAuth } from '../auth/context.ts'
import { Mark } from './Mark.tsx'

// Каркас закрытых страниц: шапка + место для страницы (Outlet).
// Шапка одна на все закрытые страницы, поэтому живёт здесь, а не в каждой странице.
export function AppShell() {
  const { state, logout } = useAuth()
  const logoutMutation = useMutation({ mutationFn: logout })
  // Тот же запрос, что на странице пространства, — но на бэк он уйдёт один раз:
  // оба компонента читают из кэша по ключу ['spaces'].
  const spaces = useSpaces()
  const location = useLocation()

  // Какое пространство открыто — достаём id из адреса /spaces/3.
  const match = location.pathname.match(/^\/spaces\/(\d+)/)
  const activeId = match ? Number(match[1]) : null
  const active = spaces.data?.find((space) => space.id === activeId)
  // Полоса над шапкой в цвете открытого пространства: сразу видно, где ты.
  const accent = active ? `var(--mantine-color-${spaceColor(active.kind)}-8)` : 'transparent'

  return (
    <Box mih="100vh">
      <Box
        component="header"
        style={{ borderTop: `4px solid ${accent}`, borderBottom: '1px solid var(--mantine-color-gray-3)' }}
      >
        <Container size="lg" py="sm">
          <Group justify="space-between" gap="sm">
            <Group gap="lg">
              <Anchor component={Link} to="/" underline="never" c="inherit">
                <Group gap="xs" wrap="nowrap">
                  <Mark height={20} />
                  <Text ff="heading" fw={600}>
                    Personal Hub
                  </Text>
                </Group>
              </Anchor>

              {/* Переключатель пространств: ссылки, а не состояние —
                  открытое пространство видно в адресе, его можно добавить в закладки. */}
              <Group component="nav" aria-label="Пространства" gap={4}>
                {spaces.data?.map((space) => {
                  const isActive = space.id === activeId
                  return (
                    <Button
                      key={space.id}
                      component={Link}
                      to={`/spaces/${space.id}`}
                      size="compact-sm"
                      variant={isActive ? 'filled' : 'subtle'}
                      color={spaceColor(space.kind)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {space.kind === 'personal' ? 'Личное' : space.name}
                    </Button>
                  )
                })}
              </Group>
            </Group>

            <Group gap="sm" wrap="nowrap">
              {state.status === 'authenticated' && (
                <Text size="sm" c="dimmed">
                  {state.user.name}
                </Text>
              )}
              <Button
                variant="default"
                size="compact-sm"
                onClick={() => logoutMutation.mutate()}
                loading={logoutMutation.isPending}
              >
                Выйти
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py="xl">
        <Outlet />
      </Container>
    </Box>
  )
}
