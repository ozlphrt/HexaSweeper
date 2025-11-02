import React, { useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Preload the printable numbers GLTF model
// Use import.meta.env.BASE_URL to respect Vite's base path configuration
const NUMBERS_MODEL_PATH = `${import.meta.env.BASE_URL}printable_numbers/scene.gltf`
useGLTF.preload(NUMBERS_MODEL_PATH)

interface DigitalNumberProps {
  number: number
  position: [number, number, number]
  scale?: number
  rotation?: [number, number, number]
}

export function DigitalNumber({ number, position, scale = 1, rotation = [0, 0, 0] }: DigitalNumberProps) {
  const { scene } = useGLTF(NUMBERS_MODEL_PATH)
  const groupRef = useRef<THREE.Group>(null)
  
  // Create a unique instance for this number
  const numberInstance = useMemo(() => {
    const instance = scene.clone()
    
    // Enable shadows for all meshes in the number
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return instance
  }, [scene])
  
  // Get the appropriate number mesh based on the digit
  const getNumberMesh = () => {
    // Debug: Let's see what nodes are available
    const allNodes: string[] = []
    numberInstance.traverse((child) => {
      if (child.name) {
        allNodes.push(child.name)
      }
    })
    console.log('Printable numbers - Available nodes:', allNodes)
    
    // The printable_numbers model has nodes named "Object_0", "Object_1", "Object_2", etc.
    // These correspond to digits 0, 1, 2, etc.
    const targetNodeName = `Object_${number}`
    console.log('Looking for node:', targetNodeName, 'for number:', number)
    
    let targetMesh: THREE.Mesh | null = null
    
    // Find the mesh by looking for meshes within the target node
    numberInstance.traverse((child) => {
      if (child.name === targetNodeName) {
        // Found the target node, now look for meshes within it
        child.traverse((grandChild) => {
          if (grandChild instanceof THREE.Mesh && !targetMesh) {
            console.log('Found mesh within node:', child.name, 'mesh:', grandChild.name)
            targetMesh = grandChild.clone()
          }
        })
      }
    })
    
    // If still not found, try direct mesh name matching
    if (!targetMesh) {
      numberInstance.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === targetNodeName) {
          console.log('Found mesh by direct name:', child.name)
          targetMesh = child.clone()
        }
      })
    }
    
    // If still not found, use the first mesh as fallback
    if (!targetMesh) {
      numberInstance.traverse((child) => {
        if (child instanceof THREE.Mesh && !targetMesh) {
          console.log('Using fallback mesh:', child.name)
          targetMesh = child.clone()
        }
      })
    }
    
    if (targetMesh) {
      // Apply a consistent material for all digits
      targetMesh.material = new THREE.MeshStandardMaterial({ 
        color: '#ffffff',
        roughness: 0.3,
        metalness: 0.1
      })
      
      return targetMesh
    }
    
    return null
  }
  
  const numberMesh = getNumberMesh()
  
  if (!numberMesh) {
    return null
  }
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <primitive object={numberMesh} castShadow />
    </group>
  )
}
