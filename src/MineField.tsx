import React from 'react'
import { Cell } from './Cell'
import { useStore } from './store'

export function MineField() {
  const { cells, config, startNewGame } = useStore()
  
  // Initialize game if no cells exist
  React.useEffect(() => {
    if (cells.length === 0) {
      startNewGame()
    }
  }, [cells.length, startNewGame])
  
  // Calculate grid positioning
  const cellSize = 1.0
  const spacing = 0.1
  const totalWidth = config.cols * cellSize + (config.cols - 1) * spacing
  const totalHeight = config.rows * cellSize + (config.rows - 1) * spacing
  const startX = -totalWidth / 2 + cellSize / 2
  const startZ = -totalHeight / 2 + cellSize / 2
  
  return (
    <group>
      {/* Grid background */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 1, totalHeight + 1]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Grid lines */}
      {Array.from({ length: config.cols + 1 }, (_, i) => (
        <mesh key={`vline-${i}`} position={[startX - cellSize/2 + i * (cellSize + spacing), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.02, totalHeight, 0.02]} />
          <meshStandardMaterial color="#34495e" />
        </mesh>
      ))}
      {Array.from({ length: config.rows + 1 }, (_, i) => (
        <mesh key={`hline-${i}`} position={[0, 0, startZ - cellSize/2 + i * (cellSize + spacing)]}>
          <boxGeometry args={[totalWidth, 0.02, 0.02]} />
          <meshStandardMaterial color="#34495e" />
        </mesh>
      ))}
      
      {/* Mine cells */}
      {cells.map((cell) => {
        const x = startX + cell.x * (cellSize + spacing)
        const z = startZ + cell.y * (cellSize + spacing)
        
        return (
          <Cell
            key={cell.id}
            cell={cell}
            position={[x, 0, z]}
            size={cellSize}
          />
        )
      })}
    </group>
  )
}
