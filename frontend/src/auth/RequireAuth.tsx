import { Navigate, Outlet, useLocation } from 'react-router'

import { FullPageLoader } from '../components/AuthLayout.tsx'
import { useAuth } from './context.ts'

// Охрана маршрутов. В App.tsx оборачивает закрытые страницы:
// <Route element={<RequireAuth />}> ...закрытые маршруты... </Route>
// Outlet — место, куда роутер подставит нужную закрытую страницу.
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'checking') {
    // Ещё не знаем, вошёл ли пользователь, — не мигаем формой входа.
    return <FullPageLoader />
  }

  if (state.status === 'guest') {
    // Запоминаем, куда шёл: после входа LoginPage вернёт сюда.
    // replace — чтобы кнопка «Назад» не возвращала на закрытую страницу.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
