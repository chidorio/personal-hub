import { Anchor, Container, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

// Любой неизвестный адрес. Link переходит без перезагрузки страницы.
export function NotFoundPage() {
  return (
    <Container size={560} py={96}>
      <Stack gap="sm">
        <Title order={2}>Такой страницы нет</Title>
        <Text c="dimmed">Проверьте адрес или вернитесь на главную.</Text>
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  )
}
