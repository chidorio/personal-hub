import { Center, Container, Loader, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

import { Mark } from './Mark.tsx'

// Общая оболочка страниц входа и регистрации: знак, заголовок, подзаголовок, форма.
// children — то, что страница положит внутрь (форма и ссылки).
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Container size={380} py={{ base: 48, sm: 120 }}>
      <Stack gap="xl">
        <Stack gap="md">
          <Mark />
          <Stack gap={4}>
            <Title order={1}>{title}</Title>
            <Text c="dimmed">{subtitle}</Text>
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Container>
  )
}

// Крутилка на весь экран, пока при старте ждём ответа /auth/refresh.
export function FullPageLoader() {
  return (
    <Center h="100vh">
      <Loader color="ink" />
    </Center>
  )
}
