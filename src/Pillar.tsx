import React, { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from './store'
import { useCursor } from '@react-three/drei'

type Props = {
  position: [number, number, number]
  height: number
  radius: number
}

// Simple hexagon segment component - no internal state
function HexSegment({ position, radius, segmentHeight, onSegmentClick }: {
  position: [number, number, number]
  radius: number
  segmentHeight: number
  onSegmentClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

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

  const { color, direction } = useMemo(() => {
    // Each color has a unique direction (6 directions total) - more desaturated colors
    const colorData = [
      { color: '#bb7777', direction: [1, 0, 0] },     // more desaturated red - right
      { color: '#77bb77', direction: [0.5, 0, 0.866] }, // more desaturated green - forward-right
      { color: '#bbbb77', direction: [-0.5, 0, 0.866] }, // more desaturated yellow - forward-left
      { color: '#7777bb', direction: [-1, 0, 0] },    // more desaturated blue - left
      { color: '#77bbbb', direction: [-0.5, 0, -0.866] }, // more desaturated cyan - back-left
      { color: '#bb77bb', direction: [0.5, 0, -0.866] }  // more desaturated magenta - back-right
    ]
    const colorIndex = Math.floor(Math.random() * 6)
    return {
      color: new THREE.Color(colorData[colorIndex].color),
      direction: colorData[colorIndex].direction
    }
  }, [])

  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3, // Softer, less reflective like polished plastic
      metalness: 0.0
    })
  }, [color])


  const onClick = (e: any) => {
    e.stopPropagation()
    onSegmentClick()
  }

  const onPointerDown = (e: any) => {
    e.stopPropagation()
  }

  return (
    <mesh
      castShadow
      receiveShadow
      geometry={geom}
      material={mat}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  )
}

export function Pillar({ position, height, radius }: Props) {
  const setFocus = useStore(s => s.setCameraRigTarget)
  const [remainingCount, setRemainingCount] = useState(height) // height is now the number of segments

  const segmentHeight = 0.1
  
  // Create a unique identifier for this pillar based on position
  const pillarId = `${position[0]}-${position[2]}`

  const handleSegmentClick = () => {
    // Simply reduce the count of remaining segments
    if (remainingCount > 0) {
      console.log(`Pillar ${pillarId}: removing segment, remaining: ${remainingCount - 1}`)
      setRemainingCount(prev => prev - 1)
    }
  }

  const segments_ = []
  // Render the remaining segments stacked from bottom up
  for (let i = 0; i < remainingCount; i++) {
    const segmentY = (i + 0.5) * segmentHeight
    segments_.push(
      <HexSegment
        key={`${pillarId}-${i}`}
        position={[0, segmentY, 0]}
        radius={radius}
        segmentHeight={segmentHeight}
        onSegmentClick={handleSegmentClick}
      />
    )
  }

  return (
    <group position={position}>
      {segments_}
    </group>
  )
}
