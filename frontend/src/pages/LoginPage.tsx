import { Alert, Box, Button, Center, Container, Loader, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/client.ts'
import { useAuth } from '../auth/context.ts'

// Текст ошибки для человека, а не код ответа.
function loginErrorText(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Неверный email или пароль.'
    if (error.status === 422) return 'Проверьте, что email записан полностью, например name@mail.ru.'
  }
  return 'Не удалось войти: сервер не отвечает. Попробуйте ещё раз.'
}

// Знак приложения: два листа — личное (чернила) и общее (слива), как в favicon.
function Mark() {
  return (
    <Box pos="relative" w={34} h={30} aria-hidden>
      <Box pos="absolute" left={0} top={0} w={20} h={30} bg="ink.8" style={{ borderRadius: 3 }} />
      <Box pos="absolute" left={14} top={0} w={20} h={30} bg="plum.8" opacity={0.85} style={{ borderRadius: 3 }} />
    </Box>
  )
}

export function LoginPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Куда вернуться после входа: RequireAuth положил путь в state.
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // Поля формы — обычное состояние компонента.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // useMutation — пара к useQuery для запросов, которые что-то меняют
  // (вход, создание, удаление). Запускается не сам, а по вызову mutate().
  // Даёт isPending (идёт запрос) и error (чем закончилось).
  const loginMutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => navigate(from, { replace: true }),
  })

  if (state.status === 'checking') {
    return (
      <Center h="100vh">
        <Loader color="ink" />
      </Center>
    )
  }
  // Уже вошёл (например, открыл /login вручную) — сразу на главную.
  if (state.status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Без этого браузер перезагрузит страницу, отправив форму по-старому.
    event.preventDefault()
    loginMutation.mutate()
  }

  return (
    <Container size={380} py={{ base: 48, sm: 120 }}>
      <Stack gap="xl">
        <Stack gap="md">
          <Mark />
          <Stack gap={4}>
            <Title order={1}>Вход</Title>
            <Text c="dimmed">Личные и общие заметки — после входа.</Text>
          </Stack>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Пароль"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            {loginMutation.isError && (
              <Alert color="red" variant="light" role="alert">
                {loginErrorText(loginMutation.error)}
              </Alert>
            )}

            <Button type="submit" loading={loginMutation.isPending} mt="xs">
              Войти
            </Button>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}
