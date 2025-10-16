import React from 'react'
import { useThree } from '@react-three/fiber'
import { HexGrid } from './HexGrid'
import { useStore } from './store'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Scene() {
  const { camera } = useThree()
  const { 
    cameraRigTarget, 
    sunlight, 
    ambientLight, 
    setCameraTarget 
  } = useStore()
  
  // Auto-focus camera on the hexgrid
  React.useEffect(() => {
    if (!cameraRigTarget) {
      // Position camera to view the entire 30x30 hexgrid
      const distance = 25 // Adjust for 30x30 grid
      camera.position.set(distance * 0.7, distance * 0.8, distance * 0.7)
      camera.lookAt(0, 0, 0)
    }
  }, [camera, cameraRigTarget])
  
  // Smooth camera movement to target
  useFrame((state, delta) => {
    if (cameraRigTarget) {
      const targetPosition = new THREE.Vector3(
        cameraRigTarget[0] + 3,
        cameraRigTarget[1] + 5,
        cameraRigTarget[2] + 3
      )
      
      camera.position.lerp(targetPosition, delta * 2)
      camera.lookAt(cameraRigTarget[0], cameraRigTarget[1], cameraRigTarget[2])
      
      // Clear target after reaching it
      if (camera.position.distanceTo(targetPosition) < 0.1) {
        setCameraTarget(null)
      }
    }
  })
  
  return (
    <>
      {/* Atmospheric fog */}
      <fog attach="fog" args={['#2c3e50', 40, 100]} />
      
      {/* Key Light - Main directional light positioned front left of camera */}
      <directionalLight
        position={[10, 15, -10]}
        intensity={sunlight}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0001}
      />
      
      
      {/* Fill Light - Softer ambient light */}
      <ambientLight intensity={0.2} />
      
      {/* Key Fill Light - Front left to balance the main sunlight */}
      <directionalLight
        position={[-8, 12, 8]}
        intensity={0.4}
        color="#ffffff"
      />
      
      {/* Rim Light - Back left for edge lighting */}
      <directionalLight
        position={[-12, 8, -8]}
        intensity={0.25}
        color="#4a90e2"
      />
      
      {/* Accent Light - Top center for overall illumination */}
      <directionalLight
        position={[0, 20, 0]}
        intensity={0.3}
        color="#ffffff"
      />
      
      {/* Green base/ground plane */}
      <mesh 
        position={[0, -0.3, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#2d5a2d" 
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
      
      {/* Hexagonal Grid */}
      <HexGrid />
    </>
  )
}