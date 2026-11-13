import { Alert, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { useState, type FormEvent } from 'react'

import { ApiError } from '../api/client.ts'
import { useAddMember } from '../api/spaces.ts'

// Текст ошибки по статусу. Статусы — из app/api/spaces.py (add_member) и deps.py.
function addMemberErrorText(error: Error): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Пользователь с таким email не найден. Сначала человеку нужно зарегистрироваться по приглашению.'
    }
    if (error.status === 403) return 'Добавлять участников может только владелец пространства.'
    if (error.status === 409) return 'Этот пользователь уже участник.'
    if (error.status === 422) return 'Проверьте, что email записан полностью, например name@mail.ru.'
  }
  return 'Не удалось добавить участника. Попробуйте ещё раз.'
}

// Форма «Добавить участника» на странице общего пространства.
export function AddMemberForm({ spaceId }: { spaceId: number }) {
  const [email, setEmail] = useState('')
  const addMember = useAddMember(spaceId)
  // Кого добавили последним — для строки «… добавлен».
  const [addedEmail, setAddedEmail] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    setAddedEmail(null)
    addMember.mutate(value, {
      onSuccess: () => {
        setAddedEmail(value)
        setEmail('')
      },
    })
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Участники</Title>
      <Text size="sm" c="dimmed">
        Укажите email, под которым человек зарегистрирован.
      </Text>
      <form onSubmit={handleSubmit}>
        <Group align="flex-end" gap="sm">
          <TextInput
            label="Email участника"
            type="email"
            required
            style={{ flex: 1, minWidth: 220 }}
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <Button type="submit" color="plum" loading={addMember.isPending}>
            Добавить
          </Button>
        </Group>
      </form>
      {addMember.isError && (
        <Alert color="red" variant="light" role="alert">
          {addMemberErrorText(addMember.error)}
        </Alert>
      )}
      {addedEmail && (
        <Text size="sm" c="teal.8" role="status">
          {addedEmail} — теперь участник.
        </Text>
      )}
    </Stack>
  )
}
