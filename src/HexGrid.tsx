import React, { useMemo } from 'react'
import { Pillar } from './Pillar'

type Props = {
  rows: number
  cols: number
  radius: number
  spacingScale?: number
}

// Proper hexagonal grid positioning for flat-top hexagons
function hexPosition(q: number, r: number, radius: number, scale: number) {
  const size = radius * scale
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
  const z = size * (3 / 2 * r)
  return [x, 0, z] as const
}

export function HexGrid({ rows, cols, radius, spacingScale = 1.0 }: Props) {
  const pillars = useMemo(() => {
    const arr: { key: string, pos: [number, number, number], height: number }[] = []
    const r0 = -Math.floor(rows / 2)
    const c0 = -Math.floor(cols / 2)
    for (let q = 0; q < cols; q++) {
      for (let r = 0; r < rows; r++) {
        const [x, y, z] = hexPosition(q + c0, r + r0, radius, spacingScale)
        const segmentCount = Math.floor(2 + Math.random() * 9) // Random 2-10 segments
        arr.push({ key: `p-${q}-${r}`, pos: [x, y, z], height: segmentCount })
      }
    }
    return arr
  }, [rows, cols, radius, spacingScale])

  return (
    <group>
      {pillars.map(p => (
        <Pillar key={p.key} position={p.pos} height={p.height} radius={radius} />
      ))}
    </group>
  )
}
