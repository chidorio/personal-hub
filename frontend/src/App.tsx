import { Route, Routes } from 'react-router'

import { RequireAuth } from './auth/RequireAuth.tsx'
import { AppShell } from './components/AppShell.tsx'
import { HomeRedirect } from './pages/HomeRedirect.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { RegisterPage } from './pages/RegisterPage.tsx'
import { SpacePage } from './pages/SpacePage.tsx'
import { StatusPage } from './pages/StatusPage.tsx'

// Карта страниц: путь → компонент.
export default function App() {
  return (
    <Routes>
      {/* Открыты всем */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/status" element={<StatusPage />} />

      {/* Только после входа. Две обёртки без path:
          RequireAuth — пускает или отправляет на /login,
          AppShell — рисует шапку, а страницу подставляет в свой Outlet. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/spaces/:spaceId" element={<SpacePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
