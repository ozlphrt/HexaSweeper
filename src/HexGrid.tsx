import React, { useEffect, useRef, useMemo } from 'react'
import { MemoizedPillar } from './Pillar'
import { useStore } from './store'
import * as THREE from 'three'

// Shared geometry for all pillars (performance optimization - single geometry instance)
let sharedHexGeometry: THREE.CylinderGeometry | null = null

function getSharedHexGeometry(radius: number): THREE.CylinderGeometry {
  if (!sharedHexGeometry) {
    const thickness = 0.15
    sharedHexGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 6, 1, false)
    
    // Add subtle chamfer to edges (only once)
    const positionAttribute = sharedHexGeometry.getAttribute('position')
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
    sharedHexGeometry.computeVertexNormals()
  }
  return sharedHexGeometry
}

export function HexGrid() {
  const { pillarConfigs, initializeGame } = useStore()
  
  const radius = 0.8
  const spacingScale = 0.85
  const rows = 50  // 50x50 grid for better circular coverage
  const cols = 50
  
  // Create pillar map for O(1) neighbor lookups (performance optimization)
  const pillarMap = useMemo(() => {
    return new Map(pillarConfigs.map(p => [p.key, p]))
  }, [pillarConfigs])
  
  // Hexagonal positioning function
  const hexPosition = (q: number, r: number) => {
    const size = radius * spacingScale
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
    const z = size * (3 / 2 * r)
    return [x, 0, z] as const
  }
  
  // Track initialization to prevent flicker on fresh start
  const isInitializing = useRef(false)
  
  // Generate grid configuration function
  const generateGrid = () => {
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
    
    return arr
  }
  
  // Initialize game immediately on mount (synchronously) to prevent flicker
  // Use useLayoutEffect to run before paint, ensuring grid exists before first render
  React.useLayoutEffect(() => {
    if (pillarConfigs.length === 0 && !isInitializing.current) {
      isInitializing.current = true
      const arr = generateGrid()
      if (arr.length > 0) {
        const mineCount = Math.floor(arr.length * 0.15) // 15% of cells are mines
        initializeGame(arr, mineCount)
      }
      isInitializing.current = false
    }
  }, []) // Only run on mount - resets handled separately
  
  // Handle reset - re-initialize when pillarConfigs becomes empty after a reset
  useEffect(() => {
    if (pillarConfigs.length === 0 && !isInitializing.current) {
      isInitializing.current = true
      const arr = generateGrid()
      if (arr.length > 0) {
        const mineCount = Math.floor(arr.length * 0.15)
        initializeGame(arr, mineCount)
      }
      isInitializing.current = false
    }
  }, [pillarConfigs.length, initializeGame])
  
  return (
    <>
      {pillarConfigs.map(({ key, pos, height }) => (
        <MemoizedPillar
          key={key}
          position={pos}
          height={height}
          radius={radius}
          allPillars={pillarConfigs}
          pillarMap={pillarMap}
          pillarKey={key}
          sharedGeometry={getSharedHexGeometry(radius)}
        />
      ))}
    </>
  )
}
