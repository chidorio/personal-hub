import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { ApiError } from '../api/client.ts'
import { useCreateSpace } from '../api/spaces.ts'

// Окно «Новое общее пространство». opened/onClose передаёт шапка:
// она решает, когда окно показать, а окно — что в нём происходит.
export function CreateSpaceModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const createSpace = useCreateSpace()

  // Закрыть и вернуть окно в исходное состояние: пустое поле, без старой ошибки.
  function close() {
    setName('')
    createSpace.reset()
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Второй аргумент mutate — что сделать именно после этого вызова.
    // Сработает уже после invalidateQueries из useCreateSpace, поэтому
    // новое пространство к этому моменту есть в списке.
    createSpace.mutate(name.trim(), {
      onSuccess: (space) => {
        close()
        navigate(`/spaces/${space.id}`)
      },
    })
  }

  const error = createSpace.error
  const errorText =
    error instanceof ApiError && error.status === 422
      ? 'Название — от 1 до 100 символов.'
      : 'Не удалось создать пространство. Попробуйте ещё раз.'

  return (
    <Modal opened={opened} onClose={close} title="Новое общее пространство" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Заметки в нём видят все участники. Добавить их можно сразу после создания.
          </Text>
          <TextInput
            label="Название"
            placeholder="Например, «Дом» или «Поездка»"
            required
            maxLength={100}
            data-autofocus
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          {error && (
            <Alert color="red" variant="light" role="alert">
              {errorText}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={close}>
              Отмена
            </Button>
            <Button type="submit" color="plum" loading={createSpace.isPending} disabled={name.trim() === ''}>
              Создать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
