import { Route, Routes } from 'react-router'

import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { StatusPage } from './pages/StatusPage.tsx'

// Карта страниц: путь → компонент. Новые экраны (вход, пространства, заметки)
// добавятся сюда на шагах 4.2–4.5.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
