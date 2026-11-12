import { Box } from '@mantine/core'

// Знак приложения: два листа — личное (чернила) и общее (слива), как в favicon.
// height — высота в пикселях, ширина считается пропорционально.
export function Mark({ height = 30 }: { height?: number }) {
  const sheetWidth = Math.round(height * 0.67)
  const shift = Math.round(height * 0.47)
  return (
    <Box pos="relative" w={shift + sheetWidth} h={height} aria-hidden style={{ flexShrink: 0 }}>
      <Box pos="absolute" left={0} top={0} w={sheetWidth} h={height} bg="ink.8" style={{ borderRadius: 3 }} />
      <Box
        pos="absolute"
        left={shift}
        top={0}
        w={sheetWidth}
        h={height}
        bg="plum.8"
        opacity={0.85}
        style={{ borderRadius: 3 }}
      />
    </Box>
  )
}
