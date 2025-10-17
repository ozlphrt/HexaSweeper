import React, { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useStore } from './store'
import * as THREE from 'three'

export function CameraTracker() {
  const { camera } = useThree()
  const { setDebugCameraPosition, setDebugCameraTarget, setDebugCameraDirection } = useStore()

  const lastUpdate = useRef(0)
  
  useFrame((state, delta) => {
    // Only update every 100ms to reduce performance impact
    const now = performance.now()
    if (now - lastUpdate.current < 100) return
    lastUpdate.current = now
    
    // Update camera position in store
    setDebugCameraPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    })

    // Calculate camera target (where it's looking)
    const target = new THREE.Vector3()
    camera.getWorldDirection(target)
    target.multiplyScalar(100) // Extend the direction vector
    target.add(camera.position)
    
    setDebugCameraTarget({
      x: target.x,
      y: target.y,
      z: target.z
    })

    // Calculate camera direction vector
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    
    setDebugCameraDirection({
      x: direction.x,
      y: direction.y,
      z: direction.z
    })
  })

  return null // This component doesn't render anything
}
