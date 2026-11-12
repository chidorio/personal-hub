import { Route, Routes } from 'react-router'

import { RequireAuth } from './auth/RequireAuth.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { RegisterPage } from './pages/RegisterPage.tsx'
import { StatusPage } from './pages/StatusPage.tsx'

// Карта страниц: путь → компонент.
export default function App() {
  return (
    <Routes>
      {/* Открыты всем */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/status" element={<StatusPage />} />

      {/* Только после входа: RequireAuth пропускает или отправляет на /login.
          Маршрут без path ничего не добавляет к адресу — это просто обёртка. */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
