import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Text3D, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from './store'
import { soundManager } from './SoundManager'

// Flag component for 3D flag models
function Flag({ position, scale = 1 }: { position: [number, number, number], scale?: number }) {
  const { scene, animations } = useGLTF('/low_poly_golf_flag_animated/scene.gltf')
  const { actions } = useAnimations(animations, scene)
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
  const { cellStates, addToRevealQueue, toggleFlag, gameStatus, debugTextRotation, debugTextOffset } = useStore()
  
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
  
  // Falling animation state
  const [isFalling, setIsFalling] = useState(false)
  const [fallProgress, setFallProgress] = useState(0)
  const [fallDelay, setFallDelay] = useState(0)
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
      setWasRevealed(true)
      // Play click sound when flip starts
      soundManager.playClick()
    }
  }, [cellState?.isRevealed, wasRevealed])

  // Trigger falling animation when game is over
  React.useEffect(() => {
    if ((gameStatus === 'won' || gameStatus === 'lost') && cellState && !isFalling) {
      // Make all revealed safe cells fall down
      if (cellState.isRevealed && !cellState.isMine) {
        // Add random delay for staggered falling effect
        const delay = Math.random() * 2000 // 0-2 seconds delay
        setFallDelay(delay)
        
        setTimeout(() => {
          setIsFalling(true)
        }, delay)
      }
    }
  }, [gameStatus, cellState, isFalling])

  useFrame((state, delta) => {
    if (meshRef.current) {
              // Handle flip animation with spring
              if (isFlipping) {
                const flipSpeed = 25.0 // radians per second (much faster)
                setFlipProgress(prev => {
                  const newProgress = prev + delta * flipSpeed
                  if (newProgress >= Math.PI) {
                    setIsFlipping(false)
                    return Math.PI
                  }
                  return newProgress
                })
              }

      // Apply flip rotation with enhanced spring effect
      if (isFlipping || flipProgress > 0) {
        const targetRotation = flipProgress
        const currentRotation = meshRef.current.rotation.x
        
        if (isFlipping) {
          // During flip - fast movement with spring
          const springFactor = 0.3
          const velocity = (targetRotation - currentRotation) * springFactor
          meshRef.current.rotation.x += velocity
          
          // Add overshoot when approaching target
          if (targetRotation >= Math.PI * 0.8) {
            const overshoot = Math.sin(state.clock.elapsedTime * 30) * 0.15
            meshRef.current.rotation.x = targetRotation + overshoot
          }
      } else {
          // After flip - spring oscillation to settle
          const springConstant = 0.4
          const damping = 0.85
          const target = Math.PI
          const error = target - currentRotation
          
          // Spring physics with less damping for faster settling
          const acceleration = error * springConstant
          const velocity = (meshRef.current.rotation.x - (meshRef.current as any).lastRotation || 0) * damping
          meshRef.current.rotation.x += velocity + acceleration * delta * 15
          
          // Store last rotation for velocity calculation
          ;(meshRef.current as any).lastRotation = meshRef.current.rotation.x
          
          // Stop oscillation when close enough
          if (Math.abs(error) < 0.02) {
            meshRef.current.rotation.x = Math.PI
            ;(meshRef.current as any).lastRotation = Math.PI
          }
        }
      }

              // Handle falling animation
              if (isFalling) {
                setFallProgress(prev => {
                  const newProgress = prev + delta * 2 // Fall speed
                  if (newProgress >= 1) {
                    return 1
                  }
                  return newProgress
                })
                
                // Apply falling motion with gravity
                const gravity = fallProgress * fallProgress // Quadratic fall
                meshRef.current.position.y = position[1] + (fallDistance * gravity)
                
                // Add some rotation during fall
                meshRef.current.rotation.z += delta * 2
                meshRef.current.rotation.x += delta * 1.5
              }
              // Handle hover animation (only when not revealed and not flipping and not falling)
              else if (hovered && gameStatus === 'playing' && cellState && !cellState.isRevealed && !isFlipping && !isFalling) {
                meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.02
              } else if (!isFlipping && !isFalling) {
                meshRef.current.position.y = 0
              }
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={hexGeometry}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={getCellColor()}
          roughness={0.4}
          metalness={0.0}
        />
      </mesh>
      
      {/* Display mine count as true 3D text on the back side of the tile */}
      {cellState?.isRevealed && !cellState.isMine && cellState.neighborMineCount > 0 && !isFlipping && flipProgress >= Math.PI && (
        <Text3D
          position={[
            debugTextOffset.x, 
            debugTextOffset.y + (isFalling ? (fallDistance * fallProgress * fallProgress) : 0), 
            0.02 + debugTextOffset.z
          ]}
          font="/fonts/helvetiker_bold.typeface.json"
          size={radius * 0.65}
          height={radius * 0.1}
          curveSegments={16}
          bevelEnabled={true}
          bevelThickness={radius * 0.02}
          bevelSize={radius * 0.01}
          bevelOffset={0}
          bevelSegments={8}
          rotation={[
            debugTextRotation.x + (isFalling ? fallProgress * 2 : 0), 
            debugTextRotation.y, 
            debugTextRotation.z + (isFalling ? fallProgress * 2 : 0)
          ]}
          anchorX="center"
          anchorY="middle"
        >
          {cellState.neighborMineCount}
          <meshStandardMaterial color="#ffffff" />
        </Text3D>
      )}
      
      
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