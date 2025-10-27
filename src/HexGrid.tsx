import React, { useEffect } from 'react'
import { Pillar } from './Pillar'
import { useStore } from './store'

export function HexGrid() {
  const { pillarConfigs, initializeGame } = useStore()
  
  const radius = 0.8
  const spacingScale = 0.85
  const rows = 50  // 50x50 grid for better circular coverage
  const cols = 50
  
  // Hexagonal positioning function
  const hexPosition = (q: number, r: number) => {
    const size = radius * spacingScale
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
    const z = size * (3 / 2 * r)
    return [x, 0, z] as const
  }
  
  // Initialize game with mines when component mounts
  useEffect(() => {
    const r0 = -Math.floor(rows / 2)  // -25
    const c0 = -Math.floor(cols / 2)  // -25
    const maxDistance = 18  // Circular boundary radius
    
    // Generate grid configuration
    const arr: { key: string, pos: [number, number, number], height: number }[] = []
    
    // Create the 50x50 hexagonal grid with circular boundary
    for (let q = 0; q < cols; q++) {
      for (let r = 0; r < rows; r++) {
        const [x, y, z] = hexPosition(q + c0, r + r0, radius, spacingScale)
        
        // Check if tile is within circular boundary
        const distanceFromCenter = Math.sqrt(x * x + z * z)
        if (distanceFromCenter > maxDistance) {
          continue  // Skip tiles outside the circular boundary
        }
        
        // 15% chance of creating a gap (no tile)
        if (Math.random() < 0.15) {
          continue
        }
        
        // Create empty pillars (height 0) for Minesweeper
        arr.push({ key: `p-${q}-${r}`, pos: [x, y, z], height: 0 })
      }
    }
    
    if (arr.length > 0) {
      const mineCount = Math.floor(arr.length * 0.15) // 15% of cells are mines
      initializeGame(arr, mineCount)
    }
  }, []) // Empty dependency array to run only once
  
  return (
    <>
      {pillarConfigs.map(({ key, pos, height }) => (
        <Pillar
          key={key}
          position={pos}
          height={height}
          radius={radius}
          allPillars={pillarConfigs}
          pillarKey={key}
        />
      ))}
    </>
  )
}
