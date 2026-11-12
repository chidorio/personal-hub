import { Alert, Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/client.ts'
import { useAuth } from '../auth/context.ts'
import { AuthLayout, FullPageLoader } from '../components/AuthLayout.tsx'

// Текст ошибки для человека, а не код ответа.
function loginErrorText(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Неверный email или пароль.'
    if (error.status === 422) return 'Проверьте, что email записан полностью, например name@mail.ru.'
  }
  return 'Не удалось войти: сервер не отвечает. Попробуйте ещё раз.'
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

  if (state.status === 'checking') return <FullPageLoader />
  // Уже вошёл (например, открыл /login вручную) — сразу на главную.
  if (state.status === 'authenticated') return <Navigate to={from} replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Без этого браузер перезагрузит страницу, отправив форму по-старому.
    event.preventDefault()
    loginMutation.mutate()
  }

  return (
    <AuthLayout title="Вход" subtitle="Личные и общие заметки — после входа.">
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

      <Text size="sm" c="dimmed">
        Есть приглашение?{' '}
        <Anchor component={Link} to="/register" size="sm">
          Зарегистрироваться
        </Anchor>
      </Text>
    </AuthLayout>
  )
}
