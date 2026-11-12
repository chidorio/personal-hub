import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Прокси для разработки: браузер ходит на localhost:5173/api/...,
    // а Vite пересылает запрос бэкенду на localhost:8000 и отрезает /api.
    // Для браузера фронтенд и API на одном адресе: CORS не нужен,
    // cookie с SameSite=Strict работает. На VPS то же самое сделает Nginx.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
