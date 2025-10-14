import React, { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from './store'
import { useCursor, useGLTF } from '@react-three/drei'

type Props = {
  position: [number, number, number]
  height: number
  radius: number
  allPillars: { key: string, pos: [number, number, number], height: number }[]
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
  const angle = Math.atan2(direction[2], direction[0])
  
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
function HexSegment({ position, radius, segmentHeight, onSegmentClick, segmentIndex, direction, targetPosition, onAnimationComplete, isBlocked }: {
  position: [number, number, number]
  radius: number
  segmentHeight: number
  onSegmentClick: () => void
  segmentIndex: number
  direction: [number, number, number]
  targetPosition?: [number, number, number]
  onAnimationComplete?: (finalPosition: [number, number, number]) => void
  isBlocked?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [spinRotation, setSpinRotation] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [startPosition, setStartPosition] = useState<[number, number, number]>(position)
  const [currentTargetPosition, setCurrentTargetPosition] = useState<[number, number, number]>(targetPosition || position)
  const meshRef = useRef<THREE.Mesh>(null)
  useCursor(hovered)

  // Animate flipping and movement
  useFrame((state, delta) => {
    if (isMoving && meshRef.current) {
      setAnimationProgress(prev => {
        const newProgress = prev + delta * 3 // 3 units per second (0.33 second duration)
        if (newProgress >= 1) {
          setIsMoving(false)
          setAnimationProgress(0)
          setSpinRotation(0)
          // Call completion callback with final position
          if (onAnimationComplete && targetPosition) {
            onAnimationComplete(targetPosition)
          }
          return 0
        }
        return newProgress
      })
      
      // Update rotation - different animation for blocked vs normal movement
      if (isBlocked) {
        // Blocked animation: shaking back and forth rapidly
        setSpinRotation(prev => {
          // Shake between -0.3 and 0.3 radians (about 17 degrees each way)
          const shakeAmount = 0.3
          const shakeSpeed = 80 // Very fast shaking
          return Math.sin(state.clock.elapsedTime * shakeSpeed) * shakeAmount
        })
      } else {
        // Normal movement: fast synchronized spinning
        setSpinRotation(prev => prev + delta * 18) // Faster spinning to match movement speed
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
    // For now, only red coins can move - others are neutral gray
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    
    // Only red direction [1, 0, 0] gets the red color and can move
    if (directionKey === '1,0,0') {
      return new THREE.Color('#bb7777') // red - movable
    } else {
      return new THREE.Color('#888888') // gray - static
    }
  }, [direction])

  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3, // Softer, less reflective like polished plastic
    metalness: 0.0
    })
  }, [color])


  const onClick = (e: any) => {
    e.stopPropagation()
    if (!isMoving) {
      // Use the current position prop as the start position (this will be the correct world position)
      setStartPosition(position)
      setIsMoving(true)
      onSegmentClick()
    }
  }

  // Calculate current position during animation
  const currentPosition = useMemo(() => {
    if (!isMoving || !targetPosition) return position
    
    const t = animationProgress
    const easeInOut = t * t * (3 - 2 * t) // Smooth easing function
    
    // Linear interpolation between start and target
    const x = startPosition[0] + (targetPosition[0] - startPosition[0]) * easeInOut
    const y = startPosition[1] + (targetPosition[1] - startPosition[1]) * easeInOut + Math.sin(t * Math.PI) * 0.5 // Add arc trajectory
    const z = startPosition[2] + (targetPosition[2] - startPosition[2]) * easeInOut
    
    return [x, y, z] as [number, number, number]
  }, [isMoving, animationProgress, startPosition, targetPosition, position])

  const onPointerDown = (e: any) => {
    e.stopPropagation()
  }

  const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
  const isRedCoin = directionKey === '1,0,0'

  return (
    <group position={currentPosition}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        geometry={geom}
        material={mat}
        rotation={[0, 0, -spinRotation]} // Flip around Z-axis (reverse direction)
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      {isRedCoin && (
        <group rotation={[0, 0, -spinRotation]}> {/* Arrow flips with the coin */}
          <DirectionArrow direction={direction} color={color} />
        </group>
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

export function Pillar({ position, height, radius, allPillars }: Props) {
  const setFocus = useStore(s => s.setCameraRigTarget)
  const setPillarHeight = useStore(s => s.setPillarHeight)
  const getPillarHeight = useStore(s => s.getPillarHeight)
  const setCoinDirection = useStore(s => s.setCoinDirection)
  const getCoinDirection = useStore(s => s.getCoinDirection)
  const setBlockedAnimation = useStore(s => s.setBlockedAnimation)
  const isBlockedAnimation = useStore(s => s.isBlockedAnimation)
  const [animatingSegments, setAnimatingSegments] = useState<Set<number>>(new Set()) // Track which segments are currently animating

  const segmentHeight = 0.2
  
  // Create a unique identifier for this pillar based on position
  const pillarId = `${position[0]}-${position[2]}`
  
  // Generate random direction for each segment
  const segmentDirections = useMemo(() => {
    // For flat-top hex grid, these are the 6 axial directions
    const directions: [number, number, number][] = [
      [1, 0, 0],      // red - right (axial q+1)
      [0, 1, 0],      // green - up-right (axial r+1)
      [-1, 1, 0],     // yellow - up-left (axial q-1, r+1)
      [-1, 0, 0],     // blue - left (axial q-1)
      [0, -1, 0],     // cyan - down-left (axial r-1)
      [1, -1, 0]      // magenta - down-right (axial q+1, r-1)
    ]
    return directions
  }, [])

  // Get current coin count from global state, or use initial height if not set
  const pillarConfigs = useStore(s => s.pillarConfigs)
  const currentCoinCount = pillarConfigs.get(pillarId) || height
  
  // Initialize pillar height and directions in global state if not already set
  React.useEffect(() => {
    if (!pillarConfigs.has(pillarId)) {
      setPillarHeight(pillarId, height)
      // Initialize directions for all segments
      for (let i = 0; i < height; i++) {
        const direction = segmentDirections[i % segmentDirections.length]
        setCoinDirection(pillarId, i, direction)
      }
    }
  }, [pillarId, height, setPillarHeight, pillarConfigs, setCoinDirection, segmentDirections])
  

  // Function to find the next pillar in a given direction using axial coordinates
  const findNextPillar = (currentPos: [number, number, number], direction: [number, number, number]) => {
    console.log(`Looking for next pillar from [${currentPos.join(',')}] in axial direction [${direction.join(',')}]`)
    
    // Convert current world position back to axial coordinates
    const currentAxial = worldToAxial(currentPos[0], currentPos[2])
    console.log(`Current axial position: [${currentAxial.q}, ${currentAxial.r}]`)
    
    // Calculate target axial position
    const targetAxial = {
      q: currentAxial.q + direction[0],
      r: currentAxial.r + direction[1]
    }
    console.log(`Target axial position: [${targetAxial.q}, ${targetAxial.r}]`)
    
    // Find the pillar at the target axial position
    for (const pillar of allPillars) {
      const pillarAxial = worldToAxial(pillar.pos[0], pillar.pos[2])
      if (pillarAxial.q === targetAxial.q && pillarAxial.r === targetAxial.r) {
        console.log(`Found target pillar: ${pillar.key} at axial [${pillarAxial.q}, ${pillarAxial.r}]`)
        return pillar
      }
    }
    
    console.log(`No pillar found at target axial position [${targetAxial.q}, ${targetAxial.r}]`)
    return null
  }
  
  // Helper function to convert world coordinates to axial coordinates
  function worldToAxial(x: number, z: number) {
    const size = radius * 0.85 // Match the spacing scale from HexGrid
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / size
    const r = (2 / 3 * z) / size
    return { q: Math.round(q), r: Math.round(r) }
  }

  const handleSegmentClick = (segmentIndex: number, direction: [number, number, number]) => {
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    
    // Only red coins can move
    if (directionKey !== '1,0,0') {
      console.log(`Pillar ${pillarId}: gray coin clicked - no movement allowed`)
      return
    }
    
    console.log(`Pillar ${pillarId}: red coin moving in direction [${direction.join(',')}]`)
    
    // Calculate current world position of this segment
    const segmentY = (segmentIndex + 0.5) * segmentHeight
    const currentSegmentWorldPos: [number, number, number] = [
      position[0], // X position of current pillar
      segmentY,    // Y position of this segment
      position[2]  // Z position of current pillar
    ]
    
    console.log(`Current segment world position: [${currentSegmentWorldPos.join(',')}]`)
    
    // Find the next pillar in the direction from current position
    const nextPillar = findNextPillar(currentSegmentWorldPos, direction)
    
    if (!nextPillar) {
      console.log(`Red coin flipped into the void! +1 point!`)
      // Start animation to flip into void (downward)
      setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
      return
    }
    
    console.log(`Found next pillar: ${nextPillar.key} at position [${nextPillar.pos.join(',')}]`)
    console.log(`Next pillar height: ${nextPillar.height}`)
    
    // Calculate current segment height (how many segments are below it)
    const currentSegmentHeight = segmentIndex + 1
    
    console.log(`Moving segment height: ${currentSegmentHeight} (segment index: ${segmentIndex})`)
    
    // Get target pillar's current height from global state
    const targetPillarId = `${nextPillar.pos[0]}-${nextPillar.pos[2]}`
    const targetPillarHeight = getPillarHeight(targetPillarId) || nextPillar.height
    
    console.log(`Target pillar current height: ${targetPillarHeight}`)
    
    // Check if we can move to this pillar
    if (targetPillarHeight > currentSegmentHeight) {
      console.log(`Cannot move - target pillar is taller (${targetPillarHeight} > ${currentSegmentHeight})`)
      // Start blocked animation (different spinning)
      setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
      setBlockedAnimation(pillarId, segmentIndex, true)
      return
    }
    
    // Mark segment as animating - the HexSegment will handle the actual movement
    setAnimatingSegments(prev => new Set([...prev, segmentIndex]))
    
    console.log(`Red coin will move to pillar: ${nextPillar.key}`)
  }

  const segments_ = []
  // Render the remaining segments stacked from bottom up
  for (let i = 0; i < currentCoinCount; i++) {
    const segmentY = (i + 0.5) * segmentHeight
    const direction = getCoinDirection(pillarId, i) // Get stored direction for this coin

    // For red coins that can move, calculate the target position based on direction
    const directionKey = `${direction[0]},${direction[1]},${direction[2]}`
    const isRedCoin = directionKey === '1,0,0'
    let redCoinTargetPosition: [number, number, number] | undefined = undefined
    
    if (isRedCoin && animatingSegments.has(i)) {
      // Calculate where this red coin should move to from its current position
      const currentSegmentWorldPos: [number, number, number] = [
        position[0], // X position of current pillar
        segmentY,    // Y position of this segment
        position[2]  // Z position of current pillar
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
        // No target pillar - flip into void (move downward and away)
        const voidDirection = direction
        const voidDistance = 3.0 // Distance to move into void (longer)
        const voidY = -2.0 // Go deeper underground
        
        redCoinTargetPosition = [
          voidDirection[0] * voidDistance, // Move in direction
          voidY,                           // Go underground
          voidDirection[1] * voidDistance  // Move in direction
        ]
        
        console.log(`Coin flipping into void: [${redCoinTargetPosition.join(',')}]`)
      }
    }

    // Segment position is always relative to current pillar
    const segmentPosition: [number, number, number] = [0, segmentY, 0]

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
        onAnimationComplete={(finalPos) => {
          console.log(`Animation complete for segment ${i} at position [${finalPos.join(',')}]`)
          
          // Check if this was a blocked animation
          if (isBlocked) {
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
            const targetPillarId = `${targetPillarPos[0]}-${targetPillarPos[2]}`
            
            // Remove coin from current pillar
            const currentHeight = pillarConfigs.get(pillarId) || 0
            setPillarHeight(pillarId, currentHeight - 1)
            
            // Add coin to target pillar
            const targetHeight = pillarConfigs.get(targetPillarId) || 0
            setPillarHeight(targetPillarId, targetHeight + 1)
            
            // Preserve the coin's direction when moving to target pillar
            const coinDirection = getCoinDirection(pillarId, i)
            setCoinDirection(targetPillarId, targetHeight, coinDirection)
            
            console.log(`Moved coin: ${pillarId} (${currentHeight} -> ${currentHeight - 1}), ${targetPillarId} (${targetHeight} -> ${targetHeight + 1})`)
            console.log(`Coin direction preserved: [${coinDirection.join(',')}]`)
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
