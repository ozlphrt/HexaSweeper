import React, { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface TestCoinProps {
  position: [number, number, number]
  direction: [number, number, number]
  isFlipping: boolean
  onFlipComplete?: () => void
}

export function TestCoin({ position, direction, isFlipping, onFlipComplete }: TestCoinProps) {
  const [animationProgress, setAnimationProgress] = useState(0)
  const [startPosition, setStartPosition] = useState<[number, number, number]>(position)
  const meshRef = useRef<THREE.Mesh>(null)

  // Calculate target position based on direction
  const targetPosition = useMemo(() => {
    const distance = 2.0 // Distance to move
    return [
      position[0] + direction[0] * distance,
      position[1],
      position[2] + direction[1] * distance
    ] as [number, number, number]
  }, [position, direction])

  // Handle flipping animation
  useFrame((state, delta) => {
    if (isFlipping && meshRef.current) {
      setAnimationProgress(prev => {
        const animationSpeed = 2 // 2 units per second
        const newProgress = prev + delta * animationSpeed
        
        if (newProgress >= 1) {
          setAnimationProgress(0)
          onFlipComplete?.()
          return 0
        }
        return newProgress
      })
    }
  })

  // Calculate current position during animation
  const currentPosition = useMemo(() => {
    if (!isFlipping) return position
    
    const t = animationProgress
    
    // Simple hinge between the two coin positions
    const hingeX = (startPosition[0] + targetPosition[0]) / 2
    const hingeY = (startPosition[1] + targetPosition[1]) / 2
    const hingeZ = (startPosition[2] + targetPosition[2]) / 2
    
    // Calculate distance from hinge to start position
    const radius = Math.sqrt(
      Math.pow(startPosition[0] - hingeX, 2) + 
      Math.pow(startPosition[1] - hingeY, 2) + 
      Math.pow(startPosition[2] - hingeZ, 2)
    )
    
    if (radius > 0.1) { // Only do hinge rotation if there's meaningful movement
      // Simple circular arc around the hinge
      const angle = t * Math.PI // 180 degrees from start to target
      
      // Calculate position on the arc
      const offsetX = startPosition[0] - hingeX
      const offsetZ = startPosition[2] - hingeZ
      
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      
      // Rotate around the hinge point
      const rotatedX = hingeX + offsetX * cos - offsetZ * sin
      const rotatedZ = hingeZ + offsetX * sin + offsetZ * cos
      const rotatedY = hingeY + Math.sin(t * Math.PI) * 0.3 // Small arc for visual appeal
      
      return [rotatedX, rotatedY, rotatedZ] as [number, number, number]
    } else {
      // Fallback to simple interpolation
      const easeInOut = t * t * (3 - 2 * t)
      const x = startPosition[0] + (targetPosition[0] - startPosition[0]) * easeInOut
      const y = startPosition[1] + (targetPosition[1] - startPosition[1]) * easeInOut + Math.sin(t * Math.PI) * 0.3
      const z = startPosition[2] + (targetPosition[2] - startPosition[2]) * easeInOut
      return [x, y, z] as [number, number, number]
    }
  }, [isFlipping, animationProgress, startPosition, targetPosition, position])

  // Update start position when flipping begins
  React.useEffect(() => {
    if (isFlipping) {
      setStartPosition(position)
    }
  }, [isFlipping, position])

  return (
    <mesh ref={meshRef} position={currentPosition}>
      <cylinderGeometry args={[0.5, 0.5, 0.2, 6]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  )
}

