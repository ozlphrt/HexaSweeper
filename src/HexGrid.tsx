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
    
    // Add regular board pillars
    for (let q = 0; q < cols; q++) {
      for (let r = 0; r < rows; r++) {
        const [x, y, z] = hexPosition(q + c0, r + r0, radius, spacingScale)
        
        // Create gaps in the grid - some positions are empty (height 0)
        const shouldSkip = Math.random() < 0.2 // 20% chance of gap
        const segmentCount = shouldSkip ? 0 : Math.floor(1 + Math.random() * 3) // Random 1-3 segments, or 0 for gaps
        
        arr.push({ key: `p-${q}-${r}`, pos: [x, y, z], height: segmentCount })
      }
    }
    
        // Add green hexagon pillars (empty pillars outside the board)
        // Hexagonal neighbor directions (flat-top hexagons)
        const hexDirections = [
          [1, 0],   // East
          [1, -1],  // Northeast  
          [0, -1],  // Northwest
          [-1, 0],  // West
          [-1, 1],  // Southwest
          [0, 1]    // Southeast
        ]
        
        // Use a Set to track unique green hexagon positions
        const greenHexagonPositions = new Set<string>()
        
        // Find edge positions and place green hexagons outside them
        for (let q = 0; q < cols; q++) {
          for (let r = 0; r < rows; r++) {
            const isEdge = q === 0 || q === cols - 1 || r === 0 || r === rows - 1
            
            if (isEdge) {
              // For each edge tile, place green hexagons in all 6 hexagonal directions
              // that would be outside the board
              hexDirections.forEach(([dq, dr], dirIndex) => {
                const neighborQ = q + dq
                const neighborR = r + dr
                
                // Check if this neighbor would be outside the board
                const isOutside = neighborQ < 0 || neighborQ >= cols || neighborR < 0 || neighborR >= rows
                
                if (isOutside) {
                  // Place green hexagon at this neighbor position
                  const [x, y, z] = hexPosition(
                    neighborQ + c0, 
                    neighborR + r0, 
                    radius, 
                    spacingScale
                  )
                  
                  // Create a unique key for the green hexagon using axial coordinates
                  const greenPillarId = `green-${neighborQ}-${neighborR}`
                  
                  // Only add if we haven't seen this position before
                  if (!greenHexagonPositions.has(greenPillarId)) {
                    greenHexagonPositions.add(greenPillarId)
                    arr.push({ key: greenPillarId, pos: [x, y, z], height: 0 })
                  }
                }
              })
            }
          }
        }
    
    return arr
  }, [rows, cols, radius, spacingScale])

  return (
    <group>
      {pillars.map(p => (
        <Pillar 
          key={p.key} 
          position={p.pos} 
          height={p.height} 
          radius={radius}
          allPillars={pillars}
          pillarKey={p.key}
        />
      ))}
    </group>
  )
}
