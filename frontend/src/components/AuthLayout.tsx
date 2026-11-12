import { Box, Center, Container, Loader, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

// Знак приложения: два листа — личное (чернила) и общее (слива), как в favicon.
function Mark() {
  return (
    <Box pos="relative" w={34} h={30} aria-hidden>
      <Box pos="absolute" left={0} top={0} w={20} h={30} bg="ink.8" style={{ borderRadius: 3 }} />
      <Box pos="absolute" left={14} top={0} w={20} h={30} bg="plum.8" opacity={0.85} style={{ borderRadius: 3 }} />
    </Box>
  )
}

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
