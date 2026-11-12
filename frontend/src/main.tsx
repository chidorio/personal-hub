import '@fontsource-variable/onest'
import '@fontsource-variable/literata'
import '@mantine/core/styles.css'

import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App.tsx'
import { cssVariablesResolver, theme } from './theme.ts'

// Один клиент TanStack Query на всё приложение: в нём кэш ответов API.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ответ считается свежим 30 секунд: при возврате на страницу не перезапрашиваем сразу.
      staleTime: 30_000,
      // Один повтор при сетевой ошибке, а не три по умолчанию.
      retry: 1,
    },
  },
})

// Обёртки снаружи внутрь: тема Mantine → кэш запросов → роутер → приложение.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
