import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Text3D, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'
import { soundManager } from './SoundManager'

// Preload the flag GLTF model to prevent first-flag flickering
useGLTF.preload('/low_poly_golf_flag_animated/scene.gltf')

// Helper function to get neighboring cells in hexagonal grid
function getNeighbors(key: string, pillarConfigs: { key: string, pos: [number, number, number], height: number }[]): string[] {
  // Extract coordinates from key (format: "p-q-r")
  const parts = key.split('-')
  if (parts.length !== 3) return []
  
  const q = parseInt(parts[1])
  const r = parseInt(parts[2])
  
  // Hexagonal neighbors (6 directions)
  const neighborOffsets = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
  ]
  
  const neighbors: string[] = []
  neighborOffsets.forEach(([dq, dr]) => {
    const neighborKey = `p-${q + dq}-${r + dr}`
    if (pillarConfigs.some(p => p.key === neighborKey)) {
      neighbors.push(neighborKey)
    }
  })
  
  return neighbors
}


// Flag component for 3D flag models
function Flag({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  const { scene, animations } = useGLTF('/low_poly_golf_flag_animated/scene.gltf')
  const { debugFlagRotation, debugFlagOffset } = useStore()
  const groupRef = useRef<THREE.Group>(null)
  
  // Create a unique instance for this flag
  const flagInstance = React.useMemo(() => {
    const instance = scene.clone()
    // Ensure the instance has its own animation mixer
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(instance)
      const action = mixer.clipAction(animations[0])
      action.play()
      
      // Store the mixer on the instance for cleanup
      ;(instance as any).mixer = mixer
    }
    return instance
  }, [scene, animations])
  
  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (flagInstance && (flagInstance as any).mixer) {
      ;(flagInstance as any).mixer.update(delta)
    }
  })
  
  return (
    <group 
      ref={groupRef} 
      position={[
        position[0] + debugFlagOffset.x, 
        position[1] + debugFlagOffset.y, 
        position[2] + debugFlagOffset.z
      ]} 
      rotation={[debugFlagRotation.x, debugFlagRotation.y, debugFlagRotation.z]}
      scale={scale}
    >
      <primitive object={flagInstance} />
    </group>
  )
}

type Props = {
  position: [number, number, number]
  height: number
  radius: number
  allPillars: { key: string, pos: [number, number, number], height: number }[]
  pillarKey: string
}

export function Pillar({ position, height, radius, allPillars, pillarKey }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const { cellStates, addToRevealQueue, toggleFlag, gameStatus, debugTextRotation, debugTextOffset, hoveredTile, setHoveredTile } = useStore()
  
  const segmentHeight = 0.2
  const cellState = cellStates[pillarKey]
  

  
  
  
  // Click vs drag detection
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const dragThreshold = 5 // pixels

  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipProgress, setFlipProgress] = useState(0)
  const [wasRevealed, setWasRevealed] = useState(false)
  
  // Game over falling animation state
  const [isFalling, setIsFalling] = useState(false)
  const [gameOverFallProgress, setGameOverFallProgress] = useState(0)
  const [gameOverFallDelay, setGameOverFallDelay] = useState(0)
  const fallDistance = -10 // Fall 10 units down
  
  
  
  // Create hexagonal geometry with chamfered edges
  const hexGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(radius, radius, segmentHeight, 6, 1, false)
    
    // Add subtle chamfer to edges
    const positionAttribute = geometry.getAttribute('position')
    const positions = positionAttribute.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      const distance = Math.sqrt(x * x + z * z)
      
      if (distance > radius * 0.7) {
        const chamferAmount = 0.15
        const normalizedX = x / distance
        const normalizedZ = z / distance
        
        positions[i] = normalizedX * (radius - chamferAmount)
        positions[i + 2] = normalizedZ * (radius - chamferAmount)
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [radius])
  
  const handlePointerDown = (event: any) => {
    if (event.button === 0) { // Left mouse button
      setDragStartPos({ x: event.clientX, y: event.clientY })
      setIsDragging(false)
    } else if (event.button === 2) { // Right mouse button
      setDragStartPos({ x: event.clientX, y: event.clientY })
      setIsDragging(false)
    } else if (event.button === 1) { // Middle mouse button
      event.stopPropagation()
      if (gameStatus === 'playing' && cellState && !cellState.isRevealed) {
        toggleFlag(pillarKey)
      }
    }
  }
  
  const handlePointerMove = (event: any) => {
    if (dragStartPos) {
      const deltaX = Math.abs(event.clientX - dragStartPos.x)
      const deltaY = Math.abs(event.clientY - dragStartPos.y)
      
      if (deltaX > dragThreshold || deltaY > dragThreshold) {
        setIsDragging(true)
      }
    }
  }
  
  const handlePointerUp = (event: any) => {
    if (!isDragging && dragStartPos) {
      // It's a click, not a drag
      if (event.button === 0) { // Left click
        event.stopPropagation()
        if (gameStatus === 'playing' && cellState && !cellState.isFlagged) {
          addToRevealQueue(pillarKey)
        }
      } else if (event.button === 2) { // Right click
        event.stopPropagation()
        if (gameStatus === 'playing' && cellState && !cellState.isRevealed) {
          toggleFlag(pillarKey)
        }
      }
    }

    // Reset drag state
    setIsDragging(false)
    setDragStartPos(null)
  }
  
  // Determine cell appearance based on state and flip progress
  const getCellColor = () => {
    if (!cellState) return "#f4efe8" // Default creamy white

    // Game over state - special colors for mines
    if (gameStatus === 'won' || gameStatus === 'lost') {
      if (cellState.isMine) {
        if (cellState.isFlagged) {
          return "#4CAF50" // Softer green for correctly flagged mines
        } else {
          return "#f44336" // Softer red for unflagged mines
        }
      }
    }

    // During flip animation, show different colors based on flip progress
    if (isFlipping || flipProgress > 0) {
      const flipRatio = flipProgress / Math.PI
      if (flipRatio < 0.5) {
        // First half of flip - show front side (unrevealed)
        if (cellState.isFlagged) return "#ff6b6b" // Red for flagged
        return "#f4efe8" // Creamy white for unrevealed
      } else {
        // Second half of flip - show back side (revealed)
        if (cellState.isMine) return "#2c3e50" // Dark blue for mine
        return "#27ae60" // Green for revealed safe cells
      }
    }

    // Normal state (not flipping)
    if (cellState.isFlagged) return "#ff6b6b" // Red for flagged
    if (cellState.isRevealed) {
      if (cellState.isMine) return "#2c3e50" // Dark blue for mine
      return "#27ae60" // Green for revealed safe cells
    }


    return "#f4efe8" // Creamy white for unrevealed
  }

  
  // Trigger flip animation when cell becomes revealed
  React.useEffect(() => {
    if (cellState?.isRevealed && !wasRevealed) {
      setIsFlipping(true)
      setFlipProgress(0)
      setWasRevealed(true)
      // Play click sound when flip starts
      soundManager.playClick()
    }
  }, [cellState?.isRevealed, wasRevealed])

  // Trigger falling animation when game is over
  React.useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && cellState && !isFalling) {
      // Only make revealed safe cells fall down
      // Keep visible: unrevealed cells, flagged cells, unflagged mine cells
      if (cellState.isRevealed && !cellState.isMine) {
        // Add random delay for staggered falling effect
        const delay = Math.random() * 2000 // 0-2 seconds delay
        setGameOverFallDelay(delay)

        setTimeout(() => {
          setIsFalling(true)
          setGameOverFallProgress(0)
        }, delay)
      }
    }
  }, [gameStatus, cellState, isFalling])


  useFrame((state, delta) => {
    if (meshRef.current) {
      // No press-down effect - tiles stay at original position
      meshRef.current.position.y = position[1]

      // Handle flip animation
      if (isFlipping) {
        const flipSpeed = 20.0 // Much faster flip animation
        setFlipProgress(prev => {
          const newProgress = prev + delta * flipSpeed
          if (newProgress >= Math.PI) {
            setIsFlipping(false)
            return Math.PI
          }
          return newProgress
        })
      }

      // Apply flip rotation (simplified for performance)
      if (isFlipping || flipProgress > 0) {
        meshRef.current.rotation.x = flipProgress
      }

      // Handle falling animation
      if (isFalling) {
        setGameOverFallProgress(prev => {
          const newProgress = prev + delta * 2 // Fall speed
          if (newProgress >= 1) {
            return 1
          }
          return newProgress
        })

        // Apply falling motion with gravity
        const gravity = gameOverFallProgress * gameOverFallProgress // Quadratic fall
        meshRef.current.position.y = position[1] + (fallDistance * gravity)

        // Add some rotation during fall
        meshRef.current.rotation.z += delta * 2
        meshRef.current.rotation.x += delta * 1.5
      }
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={hexGeometry}
        onPointerOver={() => {
          setHovered(true)
          setHoveredTile(pillarKey)
        }}
        onPointerOut={() => {
          setHovered(false)
          setHoveredTile(null)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          // Ensure hover state is maintained during mouse movement
          if (!hovered) {
            setHovered(true)
            setHoveredTile(pillarKey)
          }
          // Call the original handlePointerMove
          handlePointerMove(e)
        }}
        onPointerUp={handlePointerUp}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={getCellColor()}
          roughness={0.4}
          metalness={0.0}
        />
        
        {/* Display mine count as true 3D text */}
        {cellState?.isRevealed && !cellState.isMine && cellState.neighborMineCount > 0 && (
          <Text3D
            position={[
              debugTextOffset.x, 
              debugTextOffset.y + (isFalling ? (fallDistance * gameOverFallProgress * gameOverFallProgress) : 0), 
              0.02 + debugTextOffset.z
            ]}
            font="./fonts/helvetiker_bold.typeface.json"
            size={radius * 0.65}
            height={radius * 0.05}
            curveSegments={8}
            bevelEnabled={true}
            bevelThickness={radius * 0.01}
            bevelSize={radius * 0.005}
            bevelOffset={0}
            bevelSegments={4}
            rotation={[
              debugTextRotation.x + Math.PI + (isFalling ? gameOverFallProgress * 2 : 0), 
              debugTextRotation.y, 
              debugTextRotation.z + (isFalling ? gameOverFallProgress * 2 : 0)
            ]}
            anchorX="center"
            anchorY="middle"
            castShadow={false}
            receiveShadow={false}
          >
            {cellState.neighborMineCount}
            <meshStandardMaterial color="#ffffff" />
          </Text3D>
        )}
      </mesh>
      
      
      {/* Display mine symbol for revealed mines (only after flip completes and not game over) */}
      {cellState?.isRevealed && cellState.isMine && !isFlipping && flipProgress >= Math.PI && gameStatus === 'playing' && (
        <mesh position={[0, segmentHeight / 2 + 0.01, 0]}>
          <planeGeometry args={[radius * 0.6, radius * 0.6]} />
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.9} />
        </mesh>
      )}
      
              {/* Display 3D flag for flagged cells (always visible, not affected by flip) */}
              {cellState?.isFlagged && (
                <Flag 
                  key={`flag-${pillarKey}`}
                  position={[0, segmentHeight / 2 + 0.1, 0]} 
                  scale={radius * 1.5}
                />
              )}
    </group>
  )
}