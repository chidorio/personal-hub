// Дата для списка заметок, коротко и по-русски:
// сегодня → «сегодня, 14:05», вчера → «вчера», в этом году → «12 нояб.», раньше → «12 нояб. 2025 г.».
// Бэкенд отдаёт время в UTC (строка ISO), браузер сам переводит в местный часовой пояс.

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })
const fullFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric' })

// Начало суток в местном времени — чтобы сравнивать дни, а не моменты.
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatNoteDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const dayMs = 24 * 60 * 60 * 1000
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / dayMs)

  if (daysAgo === 0) return `сегодня, ${timeFormat.format(date)}`
  if (daysAgo === 1) return 'вчера'
  if (date.getFullYear() === now.getFullYear()) return dayFormat.format(date)
  return fullFormat.format(date)
}
