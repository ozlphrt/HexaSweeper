import React, { useRef, useState, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from './store'
import { useCursor, useGLTF } from '@react-three/drei'
import { soundManager } from './SoundManager'

type Props = {
  position: [number, number, number]
  height: number
  radius: number
  allPillars: { key: string, pos: [number, number, number], height: number }[]
  pillarKey: string
}

// Arrow component using the external GLTF model
function DirectionArrow({ direction, color }: {
  direction: [number, number, number]
  color: THREE.Color
}) {
  const { scene } = useGLTF('/models/scene.gltf')
  
  const arrowScale = 0.3 // Scale down the arrow to fit nicely on the segment
  const arrowHeight = 0.1 // Position just touching the segment (half of segmentHeight)
  
  // Calculate rotation to point in the direction
  // For hexagonal grid: direction[0] = q (horizontal), direction[1] = r (vertical)
  // Convert axial coordinates to world direction vector
  const worldX = direction[0] + direction[1] * 0.5
  const worldZ = direction[1] * Math.sqrt(3) / 2
  let angle = Math.atan2(worldZ, worldX)
  
  // Adjust arrows to point correctly
  const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
  if (directionKey === '-1,1,0') {
    angle += Math.PI * 2 / 3 // Green: Add 120 degrees (2 * 60°) to the right
  } else if (directionKey === '0,1,0') {
    angle -= Math.PI * 2 / 3 // Yellow: Subtract 120 degrees (2 * 60°) to the left
  } else if (directionKey === '0,-1,0') {
    angle -= Math.PI * 2 / 3 // Cyan: Subtract 120 degrees (2 * 60°) to the left
  } else if (directionKey === '1,-1,0') {
    angle += Math.PI * 2 / 3 // Magenta: Add 120 degrees (2 * 60°) to the right
  }
  
  // Clone the scene and replace materials to match coin color exactly
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3, // Same as coin material
      metalness: 0.0  // Same as coin material
    })
    
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = arrowMaterial
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene, color])
  
  return (
    <primitive
      object={clonedScene}
      position={[0, arrowHeight, 0]}
      scale={[arrowScale, arrowScale, arrowScale]}
      rotation={[0, angle, 0]}
    />
  )
}

// Simple hexagon segment component - no internal state
function HexSegment({ position, radius, segmentHeight, onSegmentClick, segmentIndex, direction, targetPosition, onAnimationComplete, isBlocked, pillarId }: {
  position: [number, number, number]
  radius: number
  segmentHeight: number
  onSegmentClick: () => void
  segmentIndex: number
  direction: [number, number, number]
  targetPosition?: [number, number, number]
  onAnimationComplete?: (finalPosition: [number, number, number]) => void
  isBlocked?: boolean
  pillarId: string
}) {
  const [hovered, setHovered] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [spinRotation, setSpinRotation] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [startPosition, setStartPosition] = useState<[number, number, number]>(position)
  const [currentTargetPosition, setCurrentTargetPosition] = useState<[number, number, number]>(targetPosition || position)
  const [arrowAngle, setArrowAngle] = useState(0)
  const meshRef = useRef<THREE.Mesh>(null)
  useCursor(hovered)

  // Handle animation completion in useEffect to avoid setState during render
  useEffect(() => {
    if (!isMoving && !isFlipping && animationProgress === 0 && onAnimationComplete && targetPosition) {
      onAnimationComplete(targetPosition)
    }
  }, [isMoving, isFlipping, animationProgress, onAnimationComplete, targetPosition])

  // Enhanced physics animation with momentum and bounce
  useFrame((state, delta) => {
    // Start flipping immediately when clicked, before movement
    if (isFlipping && meshRef.current) {
      setAnimationProgress(prev => {
        // Different duration for blocked vs normal animations - slower for more visible physics
        const animationSpeed = isBlocked ? 15 : 12 // Maximum speed for instant chaining
        const newProgress = prev + delta * animationSpeed
        
        // Add momentum curve for more realistic movement
        const momentumCurve = isBlocked ? 
          Math.sin(newProgress * Math.PI) : // Smooth sine curve for blocked
          newProgress < 0.5 ? 
            2 * newProgress * newProgress : // Accelerate in first half
            1 - 2 * (1 - newProgress) * (1 - newProgress) // Decelerate in second half
        
        if (newProgress >= 1) {
          setIsMoving(false)
          setIsFlipping(false)
          setAnimationProgress(0)
          setSpinRotation(0)
          return 0
        }
        return newProgress
      })
      
      // Update rotation - different animation for blocked vs normal movement
      if (isBlocked) {
        // Blocked animation: just shaking back and forth rapidly
        setSpinRotation(prev => {
          const shakeAmount = 0.3
          const shakeSpeed = 120 // Even faster shaking
          return Math.sin(state.clock.elapsedTime * shakeSpeed) * shakeAmount
        })
      } else {
        // Normal movement: spinning around the arrow direction axis
        // Calculate the arrow direction angle (same as in DirectionArrow)
        const worldX = direction[0] + direction[1] * 0.5
        const worldZ = direction[1] * Math.sqrt(3) / 2
        let arrowAngle = Math.atan2(worldZ, worldX)
        
        // Adjust for green, yellow, cyan, and magenta arrows if needed (same adjustment as in DirectionArrow)
        const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
        if (directionKey === '-1,1,0') {
          arrowAngle += Math.PI * 2 / 3 // Green: Add 120 degrees to the right
        } else if (directionKey === '0,1,0') {
          arrowAngle -= Math.PI * 2 / 3 // Yellow: Subtract 120 degrees to the left
        } else if (directionKey === '0,-1,0') {
          arrowAngle -= Math.PI * 2 / 3 // Cyan: Subtract 120 degrees to the left
        } else if (directionKey === '1,-1,0') {
          arrowAngle += Math.PI * 2 / 3 // Magenta: Add 120 degrees to the right
        }
        
        // Spin around the Z-axis with the arrow direction as the rotation axis - more dramatic
        setSpinRotation(prev => prev + delta * 80) // Maximum speed spin for instant chaining
        
        // Store the arrow angle for use in rotation
        setArrowAngle(arrowAngle)
      }
    }
  })

  const geom = useMemo(() => {
    // Create a cylinder with subtle chamfered edges
    const geometry = new THREE.CylinderGeometry(radius, radius, segmentHeight, 6, 1, false)
    
    // Add subtle chamfer to edges by slightly rounding the top and bottom vertices
    const positionAttribute = geometry.getAttribute('position')
    const positions = positionAttribute.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // Calculate distance from center
      const distance = Math.sqrt(x * x + z * z)
      
      // Only modify vertices that are very close to the outer edge
      if (distance > radius * 0.7) {
        const chamferAmount = 0.15 // Much more pronounced chamfer for very soft, rounded edges
        const normalizedX = x / distance
        const normalizedZ = z / distance
        
        // Slightly reduce the radius for edge vertices
        positions[i] = normalizedX * (radius - chamferAmount)
        positions[i + 2] = normalizedZ * (radius - chamferAmount)
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    
    return geometry
  }, [radius, segmentHeight])

  const color = useMemo(() => {
    // All coins are now white, regardless of direction
    return new THREE.Color('#ffffff') // white for all coins
  }, [direction])

  // Arrow colors based on direction
  const arrowColor = useMemo(() => {
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    
    if (directionKey === '1,0,0') {
      return new THREE.Color('#bb7777') // red arrow
    } else if (directionKey === '-1,1,0') {
      return new THREE.Color('#77bb77') // green arrow
    } else if (directionKey === '0,1,0') {
      return new THREE.Color('#bbbb77') // yellow arrow
    } else if (directionKey === '-1,0,0') {
      return new THREE.Color('#7777bb') // blue arrow
    } else if (directionKey === '0,-1,0') {
      return new THREE.Color('#77bbbb') // cyan arrow
    } else if (directionKey === '1,-1,0') {
      return new THREE.Color('#bb77bb') // magenta arrow
    } else {
      return new THREE.Color('#888888') // gray arrow for static coins
    }
  }, [direction])

  const mat = useMemo(() => {
    // Create creamy white with subtle variations based on segment index
    const baseR = 0.98 // Slightly warm red component
    const baseG = 0.96 // Slightly warm green component  
    const baseB = 0.92 // Creamy blue component
    
    // Add subtle variation based on segment index and direction
    const variation = Math.sin(segmentIndex * 2.3 + direction[0] * 1.7 + direction[1] * 1.1) * 0.02
    const r = Math.max(0.9, Math.min(1.0, baseR + variation))
    const g = Math.max(0.9, Math.min(1.0, baseG + variation * 0.8))
    const b = Math.max(0.85, Math.min(0.95, baseB + variation * 1.2))
    
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b), // Creamy white with subtle variations
      roughness: 0.4, // Slightly more matte for creamy appearance
      metalness: 0.0, // No metallic properties
      side: THREE.DoubleSide, // Render both sides for better visibility
      flatShading: false // Smooth shading for consistent appearance
    })
  }, [segmentIndex, direction])


  const onClick = (e: any) => {
    e.stopPropagation()
    if (!isMoving && !isFlipping) {
      // Play coin flip sound
      soundManager.playCoinFlip()
      
      // Start flipping immediately
      setIsFlipping(true)
      // Use the current position prop as the start position (this will be the correct world position)
      setStartPosition(position)
      setIsMoving(true)
      onSegmentClick()
    }
  }

  // Listen for animation trigger events from chain movements
  React.useEffect(() => {
    const handleTriggerAnimation = (event: CustomEvent) => {
      const { pillarId: targetPillarId, segmentIndex: targetSegmentIndex } = event.detail
      
      console.log(`HexSegment ${segmentIndex} received trigger event for pillar ${targetPillarId}, segment ${targetSegmentIndex}`)
      console.log(`Current segment pillarId: ${pillarId}, position: [${position.join(',')}]`)
      
      // Check if this segment should be triggered
      if (targetPillarId === pillarId && targetSegmentIndex === segmentIndex) {
        console.log(`MATCH! Triggering animation for segment ${segmentIndex} via event`)
        if (!isMoving && !isFlipping) {
          // Play coin flip sound
          soundManager.playCoinFlip()
          
          // Start flipping immediately
          setIsFlipping(true)
          setStartPosition(position)
          setIsMoving(true)
          onSegmentClick()
        } else {
          console.log(`Segment ${segmentIndex} is already animating, skipping`)
        }
      } else {
        console.log(`No match for segment ${segmentIndex}`)
      }
    }

    window.addEventListener('triggerSegmentAnimation', handleTriggerAnimation as EventListener)
    return () => {
      window.removeEventListener('triggerSegmentAnimation', handleTriggerAnimation as EventListener)
    }
  }, [position, segmentIndex, isMoving, isFlipping, onSegmentClick])

  // Calculate current position during animation with enhanced physics
  const currentPosition = useMemo(() => {
    if (!isMoving || !targetPosition) return position
    
    const t = animationProgress
    
    // Apply momentum curve for more realistic movement
    const momentumCurve = isBlocked ? 
      Math.sin(t * Math.PI) : // Smooth sine curve for blocked
      t < 0.5 ? 
        2 * t * t : // Accelerate in first half
        1 - 2 * (1 - t) * (1 - t) // Decelerate in second half
    
    // Add dramatic arc to movement for more visible physics
    const arcHeight = isBlocked ? 0 : Math.sin(t * Math.PI) * 0.8
    
    const x = startPosition[0] + (targetPosition[0] - startPosition[0]) * momentumCurve
    const y = startPosition[1] + (targetPosition[1] - startPosition[1]) * momentumCurve + arcHeight
    const z = startPosition[2] + (targetPosition[2] - startPosition[2]) * momentumCurve
    
    return [x, y, z] as [number, number, number]
  }, [isMoving, animationProgress, startPosition, targetPosition, position, isBlocked])

  const onPointerDown = (e: any) => {
    e.stopPropagation()
  }

  const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
  const isMovableCoin = directionKey === '1,0,0' || directionKey === '-1,1,0' || directionKey === '0,1,0' || directionKey === '-1,0,0' || directionKey === '0,-1,0' || directionKey === '1,-1,0'

  return (
    <group position={currentPosition}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        geometry={geom}
        material={mat}
        rotation={(() => {
          // All coins now flip 180 degrees only
          if (directionKey === '0,1,0') {
            // Yellow coins: flip around the edge arrow is pointing to (180 degrees only)
            return [Math.min(spinRotation, Math.PI), 0, 0]
          } else if (directionKey === '-1,1,0') {
            // Green coins: flip around the edge arrow is pointing to (180 degrees only)
            return [Math.min(spinRotation, Math.PI), 0, 0]
          } else if (directionKey === '-1,0,0') {
            // Blue coins: horizontal spin around Z-axis (180 degrees only)
            return [0, 0, Math.min(spinRotation, Math.PI)]
          } else if (directionKey === '0,-1,0') {
            // Cyan coins: flip around the edge arrow is pointing to (180 degrees only)
            return [Math.min(-spinRotation, -Math.PI), 0, 0]
          } else if (directionKey === '1,-1,0') {
            // Magenta coins: flip around the edge arrow is pointing to (180 degrees only)
            return [0, 0, Math.min(spinRotation, Math.PI)]
          } else {
            // Other coins (including red): Z-axis spin (180 degrees only)
            return [0, 0, Math.min(-spinRotation, -Math.PI)]
          }
        })()}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      {isMovableCoin && (
        <DirectionArrow direction={direction} color={arrowColor} />
      )}
    </group>
  )
}

// Helper function to calculate distance between two points
function distance(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p2[0] - p1[0]
  const dz = p2[2] - p1[2]
  return Math.sqrt(dx * dx + dz * dz)
}

  // Helper function to check if two positions are the same (within tolerance)
function positionsEqual(p1: [number, number, number], p2: [number, number, number], tolerance: number = 0.01): boolean {
  return distance(p1, p2) < tolerance
}


export function Pillar({ position, height, radius, allPillars, pillarKey }: Props) {
  const setFocus = useStore(s => s.setCameraRigTarget)
  const setPillarHeight = useStore(s => s.setPillarHeight)
  const getPillarHeight = useStore(s => s.getPillarHeight)
  const setCoinDirection = useStore(s => s.setCoinDirection)
  const getCoinDirection = useStore(s => s.getCoinDirection)
  const setBlockedAnimation = useStore(s => s.setBlockedAnimation)
  const isBlockedAnimation = useStore(s => s.isBlockedAnimation)
  const addScore = useStore(s => s.addScore)
  const addMoveToHistory = useStore(s => s.addMoveToHistory)
  const triggerConfetti = useStore(s => s.triggerConfetti)
  const [animatingSegments, setAnimatingSegments] = useState<Set<number>>(new Set()) // Track which segments are currently animating

  const segmentHeight = 0.2
  const pillarId = `${position[0]}-${position[2]}`

  // Function to check if a coin can continue moving in the same direction from its NEW location
  const checkAndContinueMove = (newPillarId: string, newSegmentIndex: number, direction: [number, number, number]) => {
    // Find the NEW pillar where the coin just landed
    const newPillar = allPillars.find(p => `${p.pos[0]}-${p.pos[2]}` === newPillarId)
    if (!newPillar) return
    
    // Check if this is a green hexagon (coins in green hexagons cannot move)
    const isGreenHexagon = !newPillar.key.startsWith('p-')
    if (isGreenHexagon) {
      console.log(`Coin in green hexagon ${newPillarId} cannot continue moving`)
      return
    }
    
    // Find the next pillar in the same direction from the NEW location
    const nextPillar = findNextPillar(newPillar.pos, direction, 1.0, 0.85)
    if (!nextPillar) {
      console.log(`No next pillar found for ${newPillarId} in direction [${direction.join(',')}]`)
      return
    }
    
    // Check height constraint from the NEW location
    const targetPillarId = `${nextPillar.pos[0]}-${nextPillar.pos[2]}`
    const targetPillarHeight = getPillarHeight(targetPillarId) || nextPillar.height
    const currentSegmentHeight = newSegmentIndex + 1
    
    const isTargetGreenHexagon = !nextPillar.key.startsWith('p-')
    if (!isTargetGreenHexagon && targetPillarHeight > currentSegmentHeight) {
      console.log(`Cannot continue move - target pillar is taller (${targetPillarHeight} > ${currentSegmentHeight})`)
      return
    }
    
    // If we can move, trigger the move from the NEW location
    console.log(`Continuing move from NEW location ${newPillarId} to ${targetPillarId}`)
    
    // Trigger the move from the NEW pillar
    const continueMoveEvent = new CustomEvent('continueMove', {
      detail: {
        pillarId: newPillarId,
        segmentIndex: newSegmentIndex,
        direction: direction
      }
    })
    window.dispatchEvent(continueMoveEvent)
  }

  // Listen for continue move events
  React.useEffect(() => {
    const handleContinueMove = (event: CustomEvent) => {
      const { pillarId: targetPillarId, segmentIndex, direction } = event.detail
      
      // Check if this pillar is the target
      if (pillarId === targetPillarId) {
        console.log(`Received continue move event for pillar ${pillarId}, segment ${segmentIndex}`)
        console.log(`About to call handleSegmentClick with segmentIndex: ${segmentIndex}, direction: [${direction.join(',')}]`)
        
        // Call handleSegmentClick which will trigger the animation
        handleSegmentClick(segmentIndex, direction, true)
      }
    }

    window.addEventListener('continueMove', handleContinueMove as EventListener)
    return () => {
      window.removeEventListener('continueMove', handleContinueMove as EventListener)
    }
  }, [pillarId])


  // Function to find the nearest stacking area based on direction
  const findNearestStackingArea = (direction: [number, number, number]): [number, number, number] => {
    const [dx, dy, dz] = direction
    
    // Determine which side the direction points to
    if (dx > 0 && dz > 0) {
      // Top-right direction - use top-right stacking area
      return [15, 0.1, 15]
    } else if (dx < 0 && dz > 0) {
      // Top-left direction - use top-left stacking area
      return [-15, 0.1, 15]
    } else if (dx > 0 && dz < 0) {
      // Bottom-right direction - use bottom-right stacking area
      return [15, 0.1, -15]
    } else if (dx < 0 && dz < 0) {
      // Bottom-left direction - use bottom-left stacking area
      return [-15, 0.1, -15]
    } else if (dx > 0) {
      // Right direction - use right stacking area
      return [20, 0.1, 0]
    } else if (dx < 0) {
      // Left direction - use left stacking area
      return [-20, 0.1, 0]
    } else if (dz > 0) {
      // Top direction - use top stacking area
      return [0, 0.1, 20]
    } else if (dz < 0) {
      // Bottom direction - use bottom stacking area
      return [0, 0.1, -20]
    }
    
    // Default fallback
    return [0, 0.1, 0]
  }
  
  // Create a unique identifier for this pillar based on position
  
  // Generate random direction for each segment
  const segmentDirections = useMemo(() => {
    // For flat-top hex grid, these are the 6 axial directions
    const directions: [number, number, number][] = [
      [1, 0, 0],      // red - right (axial q+1)
      [-1, 1, 0],     // green - up-left (axial q-1, r+1)
      [0, 1, 0],      // yellow - up-right (axial r+1)
      [-1, 0, 0],     // blue - left (axial q-1)
      [0, -1, 0],     // cyan - down-left (axial r-1)
      [1, -1, 0]      // magenta - down-right (axial q+1, r-1)
    ]
    return directions
  }, [])

  // Get current coin count from global state, or use initial height if not set
  const pillarConfigs = useStore(s => s.pillarConfigs)
  const currentCoinCount = pillarConfigs.has(pillarId) ? pillarConfigs.get(pillarId)! : height
  
  // Initialize pillar height and directions in global state if not already set
  React.useEffect(() => {
    if (!pillarConfigs.has(pillarId)) {
      setPillarHeight(pillarId, height)
      // Initialize directions for all segments with random assignment
      for (let i = 0; i < height; i++) {
        const randomDirection = segmentDirections[Math.floor(Math.random() * segmentDirections.length)]
        setCoinDirection(pillarId, i, randomDirection)
      }
    }
  }, [pillarId, setPillarHeight, pillarConfigs, setCoinDirection, segmentDirections])
  

  // Function to find the next pillar in a given direction using axial coordinates
  const findNextPillar = (currentPos: [number, number, number], direction: [number, number, number]) => {
    console.log(`Looking for next pillar from [${currentPos.join(',')}] in axial direction [${direction.join(',')}]`)
    
    // Convert current world position back to axial coordinates
    const currentAxial = worldToAxial(currentPos[0], currentPos[2])
    console.log(`Current axial position: [${currentAxial.q}, ${currentAxial.r}]`)
    console.log(`Current world position: [${currentPos[0]}, ${currentPos[2]}]`)
    console.log(`Direction: [${direction[0]}, ${direction[1]}, ${direction[2]}]`)
    
    // Calculate target axial position
    const targetAxial = {
      q: currentAxial.q + direction[0],
      r: currentAxial.r + direction[1]
    }
    console.log(`Target axial position: [${targetAxial.q}, ${targetAxial.r}]`)
    console.log(`Target world position should be: [${currentPos[0] + direction[0] * 1.7}, ${currentPos[2] + direction[1] * 1.7}]`)
    console.log(`DEBUG: currentAxial calculation: q=${currentAxial.q}, r=${currentAxial.r}`)
    console.log(`DEBUG: direction addition: q=${currentAxial.q} + ${direction[0]} = ${targetAxial.q}, r=${currentAxial.r} + ${direction[1]} = ${targetAxial.r}`)
    
    // Find the pillar at the target axial position (including gaps with height 0)
    for (const pillar of allPillars) {
      const pillarAxial = worldToAxial(pillar.pos[0], pillar.pos[2])
      console.log(`Checking pillar ${pillar.key} at world [${pillar.pos[0]}, ${pillar.pos[2]}] -> axial [${pillarAxial.q}, ${pillarAxial.r}] vs target [${targetAxial.q}, ${targetAxial.r}]`)
      
      // Use tolerance for coordinate matching to handle floating point precision issues
      const qMatch = Math.abs(pillarAxial.q - targetAxial.q) < 0.1
      const rMatch = Math.abs(pillarAxial.r - targetAxial.r) < 0.1
      
      if (qMatch && rMatch) {
        console.log(`Found target pillar: ${pillar.key} at axial [${pillarAxial.q}, ${pillarAxial.r}] with height ${pillar.height}`)
        return pillar
      }
    }
    
    console.log(`No pillar found at target axial position [${targetAxial.q}, ${targetAxial.r}] - this might be a gap or outside board`)
    
    // Check if target position is within board bounds (gap) or outside (green hexagon)
    const rows = 10
    const cols = 10
    const r0 = -Math.floor(rows / 2)  // -5
    const c0 = -Math.floor(cols / 2)  // -5
    
    console.log(`Board bounds: rows=${rows}, cols=${cols}, r0=${r0}, c0=${c0}`)
    console.log(`Target axial: [${targetAxial.q}, ${targetAxial.r}]`)
    
    const isWithinBoard = targetAxial.q >= c0 && targetAxial.q < c0 + cols && 
                         targetAxial.r >= r0 && targetAxial.r < r0 + rows
    const isOutside = targetAxial.q < c0 || targetAxial.q >= c0 + cols || 
                     targetAxial.r < r0 || targetAxial.r >= r0 + rows
    
    if (isWithinBoard) {
      // This is a gap within the board - create a virtual gap pillar
      console.log(`Found gap at axial [${targetAxial.q}, ${targetAxial.r}] - creating virtual gap pillar`)
      const size = radius * 0.85
      const x = size * (Math.sqrt(3) * targetAxial.q + Math.sqrt(3) / 2 * targetAxial.r)
      const z = size * (3 / 2 * targetAxial.r)
      
      return {
        key: `gap-${targetAxial.q}-${targetAxial.r}`,
        pos: [x, 0, z] as [number, number, number],
        height: 0
      }
    } else if (isOutside) {
      // This is outside the board - green hexagon
      console.log(`Found green hexagon at axial [${targetAxial.q}, ${targetAxial.r}]`)
      const size = radius * 0.85
      const x = size * (Math.sqrt(3) * targetAxial.q + Math.sqrt(3) / 2 * targetAxial.r)
      const z = size * (3 / 2 * targetAxial.r)
      
      // Create a regular pillar ID for the green hexagon
      const greenPillarId = `${x}-${z}`
      const greenHeight = getPillarHeight(greenPillarId) || 0
      
      return {
        key: greenPillarId,
        pos: [x, 0, z] as [number, number, number],
        height: greenHeight
      }
    }
    
    console.log(`No valid target found at axial position [${targetAxial.q}, ${targetAxial.r}]`)
    return null
  }
  
  // Helper function to convert world coordinates to axial coordinates
  function worldToAxial(x: number, z: number) {
    const size = radius * 0.85 // Match the spacing scale from HexGrid
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / size
    const r = (2 / 3 * z) / size
    return { q: Math.round(q), r: Math.round(r) } // Round to nearest integer to avoid floating point errors
  }



  const handleSegmentClick = (segmentIndex: number, direction: [number, number, number], triggerAnimation: boolean = false) => {
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    console.log(`DEBUG: Direction passed to handleSegmentClick: [${direction.join(',')}]`)
    
    // Check if this is a green hexagon (coins in green hexagons cannot move)
    const isGreenHexagon = !pillarKey.startsWith('p-')
    if (isGreenHexagon) {
      console.log(`Pillar ${pillarId}: coin in green hexagon clicked - no movement allowed`)
      return
    }
    
    // All colored coins can move
    if (directionKey !== '1,0,0' && directionKey !== '-1,1,0' && directionKey !== '0,1,0' && directionKey !== '-1,0,0' && directionKey !== '0,-1,0' && directionKey !== '1,-1,0') {
      console.log(`Pillar ${pillarId}: static coin clicked - no movement allowed`)
      console.log(`=== CLICK DEBUG END (STATIC COIN) ===`)
      return
    }
    
    console.log(`Coin is movable - proceeding with movement logic...`)

    // If this is a chain movement, trigger the animation state
    if (triggerAnimation) {
      console.log(`Triggering animation for segment ${segmentIndex} in chain movement`)
      setAnimatingSegments(prev => new Set(prev).add(segmentIndex))
      
      // Also trigger the animation by dispatching a custom event to the specific segment
      console.log(`Dispatching triggerSegmentAnimation event for pillar ${pillarId}, segment ${segmentIndex}`)
      const triggerAnimationEvent = new CustomEvent('triggerSegmentAnimation', {
        detail: {
          pillarId: pillarId,
          segmentIndex: segmentIndex
        }
      })
      window.dispatchEvent(triggerAnimationEvent)
    }

    
    console.log(`Pillar ${pillarId}: ${directionKey === '1,0,0' ? 'red' : directionKey === '-1,1,0' ? 'green' : directionKey === '0,1,0' ? 'yellow' : directionKey === '-1,0,0' ? 'blue' : directionKey === '0,-1,0' ? 'cyan' : 'magenta'} coin moving in direction [${direction.join(',')}]`)
    
    // Calculate current world position of this segment
    const segmentY = (segmentIndex + 0.5) * segmentHeight
    const currentSegmentWorldPos: [number, number, number] = [
      position[0], // X position of current pillar
      segmentY,    // Y position of this segment
      position[2]  // Z position of current pillar
    ]
    
    console.log(`Current segment world position: [${currentSegmentWorldPos.join(',')}]`)
    
    
    // Find the next pillar in the direction from current position
    console.log(`Looking for next pillar from position [${currentSegmentWorldPos.join(',')}] in direction [${direction.join(',')}]`)
    console.log(`Current segment height: ${segmentIndex + 1} (segment index: ${segmentIndex})`)
    const nextPillar = findNextPillar(currentSegmentWorldPos, direction)
    
    if (!nextPillar) {
      console.log(`No next pillar found - coin moving to void! +1 point!`)
      // Play void drop sound
      soundManager.playVoidDrop()
      
      // Get color name
      const colorMap: Record<string, string> = {
        '1,0,0': 'red',
        '-1,1,0': 'green',
        '0,1,0': 'yellow',
        '-1,0,0': 'blue',
        '0,-1,0': 'cyan',
        '1,-1,0': 'magenta'
      }
      const color = colorMap[directionKey] || 'gray'
      
      // Coin drops into void - just remove it and add score
      const currentHeight = pillarConfigs.get(pillarId) || 0
      setPillarHeight(pillarId, currentHeight - 1)
      
      // Trigger celebratory confetti at coin position
      const coinWorldPos: [number, number, number] = [
        currentSegmentWorldPos[0],
        currentSegmentWorldPos[1],
        currentSegmentWorldPos[2]
      ]
      triggerConfetti(coinWorldPos)
      
      // Add score and record move
      addScore(1)
      addMoveToHistory({
        type: 'void_drop',
        points: 1,
        description: `${color} coin dropped into void`
      })
      // Start animation to flip into void
      setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
      return
    }
    
    console.log(`Found next pillar: ${nextPillar.key} at position [${nextPillar.pos.join(',')}]`)
    console.log(`Next pillar height: ${nextPillar.height}`)
    
    // Calculate current segment height (how many segments are below it)
    const currentSegmentHeight = segmentIndex + 1
    
    console.log(`Moving segment height: ${currentSegmentHeight} (segment index: ${segmentIndex})`)
    console.log(`Target pillar key: ${nextPillar.key}`)
    console.log(`Is target a green hexagon? ${!nextPillar.key.startsWith('p-')}`)
    
    // Get target pillar's current height from global state
    const targetPillarId = `${nextPillar.pos[0]}-${nextPillar.pos[2]}`
    const targetPillarHeight = getPillarHeight(targetPillarId) || nextPillar.height
    
    console.log(`Target pillar current height: ${targetPillarHeight}`)
    
    // Check if we can move to this pillar (no height constraint for green hexagons)
    const isTargetGreenHexagon = !nextPillar.key.startsWith('p-')
    console.log(`Height check: targetPillarHeight=${targetPillarHeight}, currentSegmentHeight=${currentSegmentHeight}, isTargetGreenHexagon=${isTargetGreenHexagon}`)
    console.log(`Height comparison: ${targetPillarHeight} > ${currentSegmentHeight} = ${targetPillarHeight > currentSegmentHeight}`)
    
    if (!isTargetGreenHexagon && targetPillarHeight > currentSegmentHeight) {
      console.log(`BLOCKED: Cannot move - target pillar is taller (${targetPillarHeight} > ${currentSegmentHeight})`)
      // Play blocked sound
      soundManager.playBlocked()
      
      // Record blocked move
      addMoveToHistory({
        type: 'blocked_move',
        points: 0,
        description: `${directionKey} coin blocked by taller pillar`
      })
      // Start blocked animation (different spinning)
      setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
      setBlockedAnimation(pillarId, segmentIndex, true)
      console.log(`=== CLICK DEBUG END (BLOCKED) ===`)
      return
    }
    
    console.log(`ALLOWED: Coin will move to pillar: ${nextPillar.key}`)
    
    // Play coin drop sound for valid move
    soundManager.playCoinDrop()
    
    // Record valid move
    addMoveToHistory({
      type: 'valid_move',
      points: 0,
      description: `${directionKey} coin moved to pillar`
    })
    
    // Mark segment as animating - the HexSegment will handle the actual movement
    setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
    
    console.log(`Coin will move to pillar: ${nextPillar.key}`)
  }

  const segments_ = []
  // Render the remaining segments stacked from bottom up with slight randomness
  for (let i = 0; i < currentCoinCount; i++) {
    // With gravity, segments should touch each other but can be imperfect horizontally
    const segmentY = i * segmentHeight + segmentHeight/2 // Perfect vertical stacking (gravity)
    
    // Add horizontal randomness (X and Z offsets)
    const seedX = i * 13 + pillarId.length
    const seedZ = i * 17 + pillarId.length * 2
    const offsetX = (Math.sin(seedX) * 0.5 + 0.5 - 0.5) * 0.04 // ±0.02 horizontal offset
    const offsetZ = (Math.sin(seedZ) * 0.5 + 0.5 - 0.5) * 0.04 // ±0.02 horizontal offset
    const direction = getCoinDirection(pillarId, i) // Get stored direction for this coin
    console.log(`Coin ${i} in pillar ${pillarId}: stored direction [${direction.join(',')}]`)

    // For movable coins, calculate the target position based on direction
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    const isMovableCoin = directionKey === '1,0,0' || directionKey === '-1,1,0' || directionKey === '0,1,0' || directionKey === '-1,0,0' || directionKey === '0,-1,0' || directionKey === '1,-1,0'
    let redCoinTargetPosition: [number, number, number] | undefined = undefined
    
    if (isMovableCoin && animatingSegments.has(i)) {
      // Calculate where this red coin should move to from its current position
      const currentSegmentWorldPos: [number, number, number] = [
        position[0], // X position of current pillar
        segmentY,    // Y position of this segment
        position[2]  // Z position of current pillar
      ]
      
      // Calculate target position
      const targetPosition: [number, number, number] = [
        currentSegmentWorldPos[0] + direction[0] * 1.5 * 0.85,
        currentSegmentWorldPos[1],
        currentSegmentWorldPos[2] + direction[1] * 1.5 * 0.85
      ]
      
      const nextPillar = findNextPillar(currentSegmentWorldPos, direction)
      if (nextPillar) {
        // Get target pillar's current height from global state
        const targetPillarId = `${nextPillar.pos[0]}-${nextPillar.pos[2]}`
        const targetPillarCurrentHeight = pillarConfigs.get(targetPillarId) || nextPillar.height
        
        // Calculate target Y position - the coin should land where it will be positioned
        // in the target pillar (which will be at index targetPillarCurrentHeight)
        const targetY = (targetPillarCurrentHeight + 0.5) * segmentHeight
        
        redCoinTargetPosition = [
          nextPillar.pos[0] - position[0], // X offset from current pillar
          targetY,                         // Y position (absolute world coordinate)
          nextPillar.pos[2] - position[2]  // Z offset from current pillar
        ]
        
        console.log(`Target pillar ${targetPillarId}: current height ${targetPillarCurrentHeight}, target Y ${targetY}`)
        console.log(`Animation target position: [${redCoinTargetPosition.join(',')}]`)
      } else {
        // No target pillar - flip into void
        redCoinTargetPosition = [
          direction[0] * 2, // Move away from board
          -2 - segmentY,    // Drop down
          direction[1] * 2  // Move away from board
        ]
        
        console.log(`Coin flipping into void: [${redCoinTargetPosition.join(',')}]`)
      }
    }

    // Segment position is always relative to current pillar
    const segmentPosition: [number, number, number] = [offsetX, segmentY, offsetZ]

    // Check if this coin is in blocked animation state
    const isBlocked = isBlockedAnimation(pillarId, i)

    segments_.push(
      <HexSegment
        key={`${pillarId}-${i}`}
        position={segmentPosition}
        radius={radius}
        segmentHeight={segmentHeight}
        onSegmentClick={() => handleSegmentClick(i, direction)}
        segmentIndex={i}
        direction={direction}
        targetPosition={redCoinTargetPosition}
        isBlocked={isBlocked}
        pillarId={pillarId}
        onAnimationComplete={(finalPos) => {
          console.log(`Animation complete for segment ${i} at position [${finalPos.join(',')}]`)
          
          // Check if this was a blocked animation (check current state, not captured value)
          const currentlyBlocked = isBlockedAnimation(pillarId, i)
          if (currentlyBlocked) {
            console.log(`Blocked animation complete - coin stays in place`)
            setBlockedAnimation(pillarId, i, false)
          } else if (redCoinTargetPosition && redCoinTargetPosition[1] < 0) {
            console.log(`Coin flipped into void! +1 point!`)
            // Just remove coin from current pillar - no target pillar
            const currentHeight = pillarConfigs.get(pillarId) || 0
            setPillarHeight(pillarId, currentHeight - 1)
          } else if (redCoinTargetPosition) {
            // Normal move to target pillar
            const targetPillarPos = [
              position[0] + redCoinTargetPosition[0],
              redCoinTargetPosition[1],
              position[2] + redCoinTargetPosition[2]
            ]
            
            // Convert target position to axial coordinates to get the correct ID
            const targetAxial = worldToAxial(targetPillarPos[0], targetPillarPos[2])
            const targetPillarId = `${targetPillarPos[0]}-${targetPillarPos[2]}`
            
            // Remove coin from current pillar
            const currentHeight = pillarConfigs.get(pillarId) || 0
            setPillarHeight(pillarId, currentHeight - 1)
            
            // Add coin to target pillar (whether it's regular or green hexagon)
            const targetHeight = pillarConfigs.get(targetPillarId) || 0
            setPillarHeight(targetPillarId, targetHeight + 1)
              
            // Preserve the coin's direction when moving to target pillar
            const coinDirection = getCoinDirection(pillarId, i)
            setCoinDirection(targetPillarId, targetHeight, coinDirection)
            
            // Check for chain reaction potential
            const newTargetHeight = targetHeight + 1
            if (newTargetHeight >= 3) {
              // Potential chain reaction - check if this creates a cascade
              addMoveToHistory({
                type: 'chain_reaction',
                points: 2,
                description: `Chain reaction potential at ${targetPillarId}`
              })
              addScore(2)
            }
            
            // Check if the coin can continue moving in the same direction from its NEW location
            setTimeout(() => {
              checkAndContinueMove(targetPillarId, newTargetHeight - 1, coinDirection)
            }, 0) // No delay for instant chaining
            
            console.log(`Moved coin: ${pillarId} (${currentHeight} -> ${currentHeight - 1}), ${targetPillarId}`)
            console.log(`Target pillar position: [${targetPillarPos.join(',')}]`)
          }
          
          // Remove from animating set after state update
          setAnimatingSegments(prev => {
            const newSet = new Set(prev)
            newSet.delete(i)
            return newSet
          })
        }}
      />
    )
  }

  return (
    <group position={position}>
      {segments_}
    </group>
  )
}
