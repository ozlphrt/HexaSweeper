import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, Cell as CellType } from './store'
import { soundManager } from './SoundManager'

interface CellProps {
  cell: CellType
  position: [number, number, number]
  size: number
}

export function Cell({ cell, position, size }: CellProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  
  const { revealCell, toggleFlag, gameStatus, setCameraTarget } = useStore()
  
  // Animation for click feedback
  useFrame((state, delta) => {
    if (meshRef.current) {
      if (clicked) {
        meshRef.current.scale.lerp(new THREE.Vector3(0.95, 0.95, 0.95), delta * 10)
        if (meshRef.current.scale.x < 0.96) {
          setClicked(false)
        }
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10)
      }
      
      if (hovered && gameStatus === 'playing') {
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.02
      } else {
        meshRef.current.position.y = 0
      }
    }
  })
  
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (gameStatus === 'won' || gameStatus === 'lost') return
    
    setClicked(true)
    
    if (event.button === 0) { // Left click
      revealCell(cell.id)
      soundManager.playClick()
    } else if (event.button === 2) { // Right click
      toggleFlag(cell.id)
      soundManager.playFlag()
    }
    
    // Focus camera on clicked cell
    setCameraTarget([position[0], position[1], position[2]])
  }
  
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    handleClick(event)
  }
  
  const getCellColor = () => {
    switch (cell.state) {
      case 'hidden':
        return hovered ? '#5a6c7d' : '#4a5c6d'
      case 'revealed':
        if (cell.content === 'mine') return '#e74c3c'
        return '#ecf0f1'
      case 'flagged':
        return '#f39c12'
      default:
        return '#4a5c6d'
    }
  }
  
  const getCellContent = () => {
    if (cell.state === 'hidden') return null
    if (cell.state === 'flagged') return '🚩'
    if (cell.content === 'mine') return '💣'
    if (cell.content === 'empty') return ''
    if (typeof cell.content === 'number') return cell.content.toString()
    return null
  }
  
  const getNumberColor = (num: number): string => {
    const colors = [
      '#000000', // 0 - black (empty)
      '#3498db', // 1 - blue
      '#27ae60', // 2 - green
      '#e74c3c', // 3 - red
      '#8e44ad', // 4 - purple
      '#f39c12', // 5 - orange
      '#e67e22', // 6 - dark orange
      '#2c3e50', // 7 - dark blue
      '#7f8c8d', // 8 - gray
    ]
    return colors[num] || '#000000'
  }
  
  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[size, size * 0.1, size]} />
        <meshStandardMaterial 
          color={getCellColor()}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Cell content */}
      {cell.state === 'revealed' && getCellContent() && (
        <Text
          position={[0, size * 0.1 + 0.01, 0]}
          fontSize={size * 0.6}
          color={typeof cell.content === 'number' ? getNumberColor(cell.content) : '#000000'}
          anchorX="center"
          anchorY="middle"
          font="/fonts/roboto.woff"
        >
          {getCellContent()}
        </Text>
      )}
      
      {/* Flag */}
      {cell.state === 'flagged' && (
        <Text
          position={[0, size * 0.1 + 0.01, 0]}
          fontSize={size * 0.5}
          color="#e74c3c"
          anchorX="center"
          anchorY="middle"
        >
          🚩
        </Text>
      )}
      
      {/* Mine explosion effect */}
      {cell.state === 'revealed' && cell.content === 'mine' && gameStatus === 'lost' && (
        <mesh position={[0, size * 0.2, 0]}>
          <sphereGeometry args={[size * 0.3, 8, 6]} />
          <meshStandardMaterial 
            color="#ff6b6b"
            emissive="#ff0000"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  )
}
