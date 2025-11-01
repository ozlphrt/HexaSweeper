import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

import { useStore } from './store'
import { soundManager } from './SoundManager'
import { DigitalNumber } from './DigitalNumber'

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
function Flag({ position, scale = 1, color = "#ff6b6b" }: { position: [number, number, number], scale?: number, color?: string }) {
  const { scene, animations } = useGLTF('/low_poly_golf_flag_animated/scene.gltf')
  const { debugFlagRotation, debugFlagOffset } = useStore()
  const groupRef = useRef<THREE.Group>(null)
  
  // Create a unique instance for this flag
  const flagInstance = React.useMemo(() => {
    const instance = scene.clone()
    
    // Enable shadows and apply color to all meshes in the flag
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        // Apply the color to the flag material
        if (child.material) {
          child.material = child.material.clone()
          
          // Check if this is the pole (usually named differently or has different geometry)
          // For now, we'll use a simple heuristic: if the mesh is tall and thin, it's likely the pole
          const boundingBox = new THREE.Box3().setFromObject(child)
          const size = boundingBox.getSize(new THREE.Vector3())
          const isPole = size.y > size.x && size.y > size.z && size.y > 0.5
          
          if (isPole) {
            // Make the pole white (same as white tiles)
            child.material.color.set("#ffffff")
          } else {
            // Make the flag red
            child.material.color.set(color)
          }
        }
      }
    })
    
    // Ensure the instance has its own animation mixer
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(instance)
      const action = mixer.clipAction(animations[0])
      action.play()
      
      // Store the mixer on the instance for cleanup
      ;(instance as any).mixer = mixer
    }
    return instance
  }, [scene, animations, color])
  
  // Update animation mixer on each frame (throttled)
  const lastAnimationUpdate = useRef(0)
  useFrame((state, delta) => {
    const now = performance.now()
    if (now - lastAnimationUpdate.current < 16) return // ~60fps max
    lastAnimationUpdate.current = now
    
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
      castShadow
    >
      <primitive object={flagInstance} castShadow />
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
  
  // Use selectors to only subscribe to specific store values, preventing unnecessary re-renders
  const cellState = useStore(state => state.cellStates[pillarKey])
  const addToRevealQueue = useStore(state => state.addToRevealQueue)
  const toggleFlag = useStore(state => state.toggleFlag)
  const gameStatus = useStore(state => state.gameStatus)
  // DO NOT subscribe to debugTextRotation/Offset/Scale - read via refs in useFrame to prevent re-renders
  const hoveredTile = useStore(state => state.hoveredTile)
  const setHoveredTile = useStore(state => state.setHoveredTile)
  const gameResetTrigger = useStore(state => state.gameResetTrigger)
  const immortalMode = useStore(state => state.immortalMode)
  const clickedMinePosition = useStore(state => state.clickedMinePosition)
  
  // DO NOT subscribe to debug values - read directly from store in useFrame to prevent re-renders
  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false)
  const [wasRevealed, setWasRevealed] = useState(false)
  
  // Click vs drag detection
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const dragThreshold = 3 // pixels - reduced for better responsiveness
  const flipStartTime = useRef<number>(0)
  const flipDuration = 0.3 // 300ms flip duration
  
  // Game over falling animation state
  const [isFalling, setIsFalling] = useState(false)
  const [gameOverFallProgress, setGameOverFallProgress] = useState(0)
  const [gameOverFallDelay, setGameOverFallDelay] = useState(0)
  const fallDistance = -10 // Fall 10 units down
  
  // Simple ref for text group to update position/rotation
  const textGroupRef = useRef<THREE.Group>(null)
  
  // Track if text was ever shown - once true, never becomes false (except on reset)
  // This ensures text stays visible even if cellState is temporarily undefined during re-renders
  const textWasShownRef = useRef(false)
  const neighborCountRef = useRef<number | null>(null)
  const neighborCountStringRef = useRef<string>('') // Start empty, not '0' - only set when we have valid data
  
  // Store offset/rotation/scale/font in refs - updated in useFrame from store directly (no subscriptions)
  const offsetRef = useRef({ x: 0, y: 0, z: 0 })
  const rotationRef = useRef({ x: 0, y: 0, z: 0 })
  const scaleRef = useRef(0.72)
  const fontRef = useRef<string>('/fonts/helvetiker_bold.typeface.json')
  
  // Check if text should be displayed
  const shouldShowText = cellState && cellState.isRevealed && !cellState.isMine && cellState.neighborMineCount > 0
  
  // Once text should be shown, mark it as shown forever and store the count
  // CRITICAL: Only set once - lock in the value when first shown
  // IMPORTANT: Update refs BEFORE text becomes visible to prevent showing '0'
  if (cellState?.isRevealed && !cellState?.isMine && cellState?.neighborMineCount !== undefined && cellState.neighborMineCount > 0) {
    // Always update the refs when we have valid data (not just first time)
    // This ensures we have the correct value before text becomes visible
    neighborCountRef.current = cellState.neighborMineCount
    neighborCountStringRef.current = String(cellState.neighborMineCount)
    if (!textWasShownRef.current) {
      textWasShownRef.current = true
    }
  }
  
  // Update text position/rotation/size in useFrame - read directly from store, NO subscriptions
  // CRITICAL: Reading from store.getState() in useFrame prevents component re-renders
  // This ensures Text component never unmounts when offset sliders change
  useFrame(() => {
    // Read debug values directly from store (no subscription = no re-render)
    const storeState = useStore.getState()
    offsetRef.current = storeState.debugTextOffset
    rotationRef.current = storeState.debugTextRotation
    scaleRef.current = storeState.debugTextScale
    fontRef.current = storeState.debugTextFont
    
    // Only update if text group exists and we have valid data (check string ref to ensure we have content)
    if (textGroupRef.current && neighborCountStringRef.current && neighborCountRef.current !== null) {
      const fallY = isFalling ? (fallDistance * gameOverFallProgress * gameOverFallProgress) : 0
      const fallRot = isFalling ? gameOverFallProgress * 2 : 0
      
      // Use ref values (updated from store above)
      textGroupRef.current.position.set(
        offsetRef.current.x * radius,
        (offsetRef.current.y + fallY) * radius,
        (0.02 + offsetRef.current.z) * radius
      )
      textGroupRef.current.rotation.set(
        rotationRef.current.x + fallRot,
        rotationRef.current.y,
        rotationRef.current.z + fallRot
      )
      
      // Update scale from ref
      textGroupRef.current.scale.setScalar(scaleRef.current / 0.72)
      
      textGroupRef.current.visible = true
    } else if (textGroupRef.current) {
      textGroupRef.current.visible = false
    }
  })
  
  // Calculate tile thickness for positioning elements
  const getTileThickness = () => {
    return 0.15
  }

  // Reset all animation states when game is reset
  React.useEffect(() => {
    setIsFlipping(false)
    setWasRevealed(false)
    setIsFalling(false)
    setGameOverFallProgress(0)
    setGameOverFallDelay(0)
    flipStartTime.current = 0
           textWasShownRef.current = false
           neighborCountRef.current = null
           neighborCountStringRef.current = ''
           // Reset font ref to current store value
           fontRef.current = useStore.getState().debugTextFont
           // Hide text on reset
           if (textGroupRef.current) {
             textGroupRef.current.visible = false
           }
  }, [gameResetTrigger])
  
  
  
  // Create hexagonal geometry with chamfered edges
  const hexGeometry = useMemo(() => {
    const thickness = 0.15
    
    const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 6, 1, false)
    
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
  
  const lastClickTime = useRef(0)
  
  const handlePointerUp = (event: any) => {
    if (!isDragging && dragStartPos) {
      // Throttle clicks to prevent multiple rapid clicks
      const now = performance.now()
      if (now - lastClickTime.current < 200) return // 200ms cooldown
      lastClickTime.current = now
      
      // It's a click, not a drag
      if (event.button === 0) { // Left click
        event.stopPropagation()
        if (gameStatus === 'playing' && cellState && !cellState.isFlagged) {
          // AudioContext is pre-initialized on first user interaction (see App.tsx)
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

    // Game over state - special colors for mines and heatmap for unflipped tiles
    if (gameStatus === 'won' || gameStatus === 'lost') {
      if (cellState.isMine) {
        if (cellState.isFlagged) {
          return "#4CAF50" // Softer green for correctly flagged mines
        } else {
          return "#f44336" // Softer red for unflagged mines
        }
      }
      
      // Apply heatmap to unflipped (unrevealed) tiles based on distance to clicked mine
      if (gameStatus === 'lost' && !cellState.isRevealed && !cellState.isFlagged && clickedMinePosition) {
        // Calculate hex distance (manhattan-like distance on hex grid)
        // Extract hex coordinates from position (approximate - assumes grid spacing)
        // Find which pillar corresponds to clicked mine
        const clickedMinePillar = allPillars.find(p => {
          const dx = Math.abs(p.pos[0] - clickedMinePosition[0])
          const dz = Math.abs(p.pos[2] - clickedMinePosition[2])
          return dx < 0.5 && dz < 0.5 // Small threshold for matching
        })
        
        if (clickedMinePillar) {
          // Calculate hex distance using axial coordinates
          const [clickedQ, clickedR] = clickedMinePillar.key.split('-').slice(1).map(Number)
          const [currentQ, currentR] = pillarKey.split('-').slice(1).map(Number)
          
          // Hex distance in axial coordinates
          const hexDistance = (Math.abs(clickedQ - currentQ) + 
                              Math.abs(clickedQ + clickedR - currentQ - currentR) + 
                              Math.abs(clickedR - currentR)) / 2
          
          // Normalize distance (assuming max grid distance ~15-20 hex units)
          const maxDistance = 15
          const normalizedDistance = Math.min(hexDistance / maxDistance, 1)
          
          // Create heatmap: closer = vibrant red/orange, farther = orange/yellow
          // Mine red (#f44336 = rgb(244, 67, 54))
          // Hottest: One tone less saturated than mine = rgb(244, 75, 62)
          // Red (close) -> Orange -> Yellow (far, still saturated)
          let r, g, b
          if (normalizedDistance < 0.33) {
            // Close: Vibrant red (one tone less saturated than mine) to Orange
            const t = normalizedDistance / 0.33
            r = 244
            g = Math.floor(75 + (130 * t)) // 75 -> 205
            b = Math.floor(62 + (43 * t))  // 62 -> 105
          } else if (normalizedDistance < 0.66) {
            // Mid: Orange to Yellow (more saturated)
            const t = (normalizedDistance - 0.33) / 0.33
            r = 255
            g = Math.floor(205 + (50 * t))  // 205 -> 255
            b = Math.floor(105 - (55 * t))  // 105 -> 50
          } else {
            // Far: Yellow to light yellow (still somewhat saturated, not white)
            const t = (normalizedDistance - 0.66) / 0.34
            r = 255
            g = 255
            b = Math.floor(50 + (100 * t))  // 50 -> 150 (light yellow, not white)
          }
          
          return `rgb(${r}, ${g}, ${b})`
        }
      }
    }

    // During flip animation, show different colors based on flip progress
    if (isFlipping) {
      const currentTime = performance.now()
      const elapsed = (currentTime - flipStartTime.current) / 1000
      const progress = Math.min(elapsed / flipDuration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const flipRatio = easedProgress
      
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
    if (cellState.isRevealed) {
      if (cellState.isMine) {
        // In immortal mode, show black for clicked mines (prioritize over flagged)
        if (immortalMode && cellState.isImmortalMine) {
          return "#000000" // Black for immortal mine
        }
        return "#2c3e50" // Dark blue for regular mine
      }
      return "#27ae60" // Green for revealed safe cells
    }
    if (cellState.isFlagged) {
      return "#ff6b6b" // Red for all flagged tiles
    }

    return "#f4efe8" // Creamy white for unrevealed
  }

  
  // Trigger flip animation when cell becomes revealed
  React.useEffect(() => {
    if (cellState?.isRevealed && !wasRevealed) {
      setIsFlipping(true)
      flipStartTime.current = performance.now()
      setWasRevealed(true)
      // Play click sound when flip starts (unless it's a mine - game over sound will play instead)
      if (!cellState.isMine && gameStatus !== 'lost') {
        soundManager.playClick()
      }
    }
  }, [cellState?.isRevealed, wasRevealed, cellState?.isMine, gameStatus])

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

      // Handle flip animation - optimized for performance
      if (isFlipping) {
        const currentTime = performance.now()
        const elapsed = (currentTime - flipStartTime.current) / 1000 // Convert to seconds
        const progress = Math.min(elapsed / flipDuration, 1)
        
        if (progress >= 1) {
          setIsFlipping(false)
          meshRef.current.rotation.x = 0 // Reset rotation
        } else {
          // Use easing function for smoother animation
          const easedProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
          meshRef.current.rotation.x = easedProgress * Math.PI
        }
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
          roughness={0.3}
          metalness={0.0}
        />
        
      </mesh>
      
      {/* Display mine count as text - only render when we have valid data */}
      {/* Component renders only when neighborCountStringRef has valid content to prevent showing '0' */}
      {/* Visibility controlled by conditional rendering + group.visible in useFrame */}
      {/* Stable key prevents remounting - content updates via children prop */}
      {neighborCountStringRef.current && (
        <group ref={textGroupRef}>
          <Text
            key={`text-${pillarKey}`}
            position={[0, 0, 0]}
            fontSize={radius * 0.72}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0}
            strokeWidth={0.08}
            strokeColor="#ffffff"
          >
            {neighborCountStringRef.current}
          </Text>
        </group>
      )}
      
      
      {/* Display mine symbol for revealed mines (only after flip completes and not game over) */}
      {cellState?.isRevealed && cellState.isMine && !isFlipping && gameStatus === 'playing' && (
        <mesh position={[0, getTileThickness() / 2 + 0.01, 0]}>
          <planeGeometry args={[radius * 0.6, radius * 0.6]} />
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.9} />
        </mesh>
      )}
      
              {/* Display 3D flag for flagged cells (always visible, not affected by flip) */}
              {cellState?.isFlagged && (
                <Flag 
                  key={`flag-${pillarKey}`}
                  position={[0, getTileThickness() / 2 + 0.2, 0]} 
                  scale={radius * 1.5}
                  color={getCellColor()}
                />
              )}
    </group>
  )
}