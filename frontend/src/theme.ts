import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

// Два «своих» цвета: у личного пространства — синие чернила, у общего — слива.
// Это единственный яркий акцент интерфейса: по нему всегда видно, где ты пишешь.
// Mantine ждёт 10 оттенков от светлого к тёмному; основной — индекс 8.
const ink: MantineColorsTuple = [
  '#eef2fa',
  '#dbe2f2',
  '#b4c3e4',
  '#8aa2d6',
  '#6886ca',
  '#5274c3',
  '#4569bf',
  '#3758a8',
  '#2f4b8a',
  '#243b70',
]

const plum: MantineColorsTuple = [
  '#fbeef4',
  '#f2dbe5',
  '#e4b3c8',
  '#d689aa',
  '#ca6690',
  '#c35181',
  '#bf4579',
  '#a83867',
  '#8c3d63',
  '#71304f',
]

export const theme = createTheme({
  colors: { ink, plum },
  primaryColor: 'ink',
  primaryShade: { light: 8, dark: 4 },
  black: '#1f2a2e',
  // Onest — интерфейс (кнопки, поля, подписи). Literata — заголовки и текст заметок:
  // заметки читают, поэтому для них шрифт с засечками.
  fontFamily: "'Onest Variable', system-ui, sans-serif",
  headings: {
    fontFamily: "'Literata Variable', Georgia, serif",
    fontWeight: '600',
  },
  defaultRadius: 'sm',
})

// Фон страницы — прохладная серо-зелёная «бумага», а не чисто белый:
// на нём белые поля ввода и выделенная заметка читаются без теней.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#f2f4f0',
  },
  dark: {},
})
