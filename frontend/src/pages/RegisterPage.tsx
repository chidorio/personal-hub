import { Alert, Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'

import { ApiError, apiFetch } from '../api/client.ts'
import type { User } from '../api/types.ts'
import { useAuth } from '../auth/context.ts'
import { AuthLayout, FullPageLoader } from '../components/AuthLayout.tsx'

type Fields = { name: string; email: string; password: string; inviteCode: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

// Те же ограничения, что в UserCreate на бэкенде (app/schemas/user.py).
// Это подсказка до отправки, а не защита: проверяет всё равно сервер.
function validate(fields: Fields): FieldErrors {
  const errors: FieldErrors = {}
  if (fields.name.length === 0) errors.name = 'Укажите имя.'
  if (fields.password.length < 8) errors.password = 'Пароль — минимум 8 символов.'
  if (fields.inviteCode.length < 10) errors.inviteCode = 'Код слишком короткий: проверьте, что скопировали целиком.'
  return errors
}

// Текст ошибки по статусу ответа. Статусы — из app/api/auth.py (register_user).
function RegisterErrorText({ error }: { error: Error }) {
  if (error instanceof ApiError) {
    if (error.status === 400) return <>Приглашение недействительно или истекло. Попросите новый код.</>
    if (error.status === 409) {
      return (
        <>
          Этот email уже зарегистрирован.{' '}
          <Anchor component={Link} to="/login" size="sm">
            Войти
          </Anchor>
        </>
      )
    }
    if (error.status === 422) return <>Проверьте email: он должен быть полным, например name@mail.ru.</>
  }
  return <>Не удалось зарегистрироваться: сервер не отвечает. Попробуйте ещё раз.</>
}

export function RegisterPage() {
  const { state, login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Два запроса подряд: создать пользователя, затем сразу войти теми же данными.
  const registerMutation = useMutation({
    mutationFn: async (fields: Fields) => {
      await apiFetch<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          password: fields.password,
          invite_code: fields.inviteCode, // на бэкенде поле в snake_case
        }),
      })
      await login(fields.email, fields.password)
    },
    onSuccess: () => navigate('/', { replace: true }),
  })

  if (state.status === 'checking') return <FullPageLoader />
  if (state.status === 'authenticated') return <Navigate to="/" replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Пробелы по краям — частая ошибка при копировании кода и email.
    const fields: Fields = { name: name.trim(), email: email.trim(), password, inviteCode: inviteCode.trim() }
    const errors = validate(fields)
    setFieldErrors(errors)
    if (Object.keys(errors).length === 0) registerMutation.mutate(fields)
  }

  const error = registerMutation.error

  return (
    <AuthLayout title="Регистрация" subtitle="По приглашению: код выдаёт владелец.">
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          <TextInput
            label="Код приглашения"
            autoComplete="off"
            required
            maxLength={64}
            value={inviteCode}
            error={fieldErrors.inviteCode}
            onChange={(event) => setInviteCode(event.currentTarget.value)}
          />
          <TextInput
            label="Имя"
            description="Его увидит второй участник общего пространства."
            autoComplete="given-name"
            required
            maxLength={100}
            value={name}
            error={fieldErrors.name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
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
            description="Минимум 8 символов."
            autoComplete="new-password"
            required
            maxLength={128}
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />

          {error && (
            <Alert color="red" variant="light" role="alert">
              <RegisterErrorText error={error} />
            </Alert>
          )}

          <Button type="submit" loading={registerMutation.isPending} mt="xs">
            Зарегистрироваться
          </Button>
        </Stack>
      </form>

      <Text size="sm" c="dimmed">
        Уже есть аккаунт?{' '}
        <Anchor component={Link} to="/login" size="sm">
          Войти
        </Anchor>
      </Text>
    </AuthLayout>
  )
}
