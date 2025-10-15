import React from 'react'
import { useThree } from '@react-three/fiber'
import { HexGrid } from './HexGrid'
import { TestCoin } from './TestCoin'
import { Confetti } from './Confetti'
import { useStore } from './store'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SceneProps {
  calibrationMode?: boolean
  testCoin?: {
    position: [number, number, number]
    direction: [number, number, number]
    isFlipping: boolean
    onFlipComplete?: () => void
  }
}

export default function Scene({ calibrationMode = false, testCoin }: SceneProps) {
  const sunlight = useStore(s => s.sunlight)
  const ambientLight = useStore(s => s.ambientLight)
  const focus = useStore(s => s.cameraRigTarget)
  const confettiEvents = useStore(s => s.confettiEvents)
  const removeConfetti = useStore(s => s.removeConfetti)

  const dirLight = React.useRef<THREE.DirectionalLight>(null!)
  const { camera, controls } = useThree()

  // Simple camera rig: smoothly move camera & target toward desired focus
  useFrame((_, dt) => {
    if (focus) {
      const maxDt = Math.min(dt, 0.033)
      const lerp = 1.0 - Math.pow(0.001, maxDt) // ~exp smoothing
      const desiredPos = new THREE.Vector3(focus[0] + 6, focus[1] + 6, focus[2] + 8)
      camera.position.lerp(desiredPos, lerp)
      // @ts-ignore
      if (controls) {
        // @ts-ignore
        controls.target.lerp(new THREE.Vector3(focus[0], focus[1], focus[2]), lerp)
        // @ts-ignore
        controls.update()
      }
      
      // Clear focus after reaching target to stop continuous movement
      const distance = camera.position.distanceTo(desiredPos)
      if (distance < 0.1) {
        useStore.getState().setCameraRigTarget(null)
      }
    }
  })

  return (
    <>
      {/* Atmospheric fog */}
      <fog attach="fog" args={['#2c3e50', 25, 80]} />
      
      {/* Key Light - Main directional light */}
      <directionalLight
        ref={dirLight}
        castShadow
        position={[15, 20, 10]}
        intensity={sunlight * 1.2}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-radius={12}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      
      {/* Fill Light - Soft directional light from opposite side */}
      <directionalLight
        position={[-10, 15, -8]}
        intensity={sunlight * 0.8}
        color="#ffffff"
      />
      
      {/* Rim Light - Back light for edge definition */}
      <directionalLight
        position={[0, 10, -15]}
        intensity={sunlight * 0.6}
        color="#ffffff"
      />
      
      {/* Additional fill light from left side */}
      <directionalLight
        position={[-15, 12, 5]}
        intensity={sunlight * 0.5}
        color="#ffffff"
      />
      
      {/* Soft ambient fill */}
      <ambientLight intensity={0.25 + ambientLight * 0.2} color="#ffffff" />
      
      {/* Casino green base plane that receives shadows */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#0F5132" 
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
      
      {!calibrationMode ? (
        <HexGrid rows={10} cols={10} radius={1.0} spacingScale={0.85} />
      ) : (
        <>
          {/* Test coin with flipping animation */}
          {testCoin && (
            <TestCoin 
              position={testCoin.position}
              direction={testCoin.direction}
              isFlipping={testCoin.isFlipping}
              onFlipComplete={testCoin.onFlipComplete}
            />
          )}
          
          {/* Target position indicator */}
          {testCoin && (
            <mesh position={[testCoin.position[0] + testCoin.direction[0] * 2, testCoin.position[1], testCoin.position[2] + testCoin.direction[1] * 2]}>
              <cylinderGeometry args={[0.5, 0.5, 0.2, 6]} />
              <meshStandardMaterial color="#ff0000" transparent opacity={0.3} />
            </mesh>
          )}
        </>
      )}

      {/* Confetti Effects */}
      {confettiEvents.map((event) => (
        <Confetti
          key={event.id}
          position={event.position}
          isActive={event.isActive}
          onComplete={() => removeConfetti(event.id)}
        />
      ))}

      {/* Empty Pillar Bases around the board - outside edge tiles */}
      {(() => {
        const pillarBases = []
        const radius = 1.0
        const spacingScale = 0.85
        const rows = 10
        const cols = 10
        
        // Hexagonal positioning function (same as HexGrid)
        const hexPosition = (q: number, r: number) => {
          const size = radius * spacingScale
          const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
          const z = size * (3 / 2 * r)
          return [x, 0, z] as const
        }
        
        const r0 = -Math.floor(rows / 2)
        const c0 = -Math.floor(cols / 2)
        
        // Hexagonal neighbor directions (flat-top hexagons)
        const hexDirections = [
          [1, 0],   // East
          [1, -1],  // Northeast  
          [0, -1],  // Northwest
          [-1, 0],  // West
          [-1, 1],  // Southwest
          [0, 1]    // Southeast
        ]
        
        // Find edge positions and place empty bases outside them following honeycomb structure
        for (let q = 0; q < cols; q++) {
          for (let r = 0; r < rows; r++) {
            const [x, y, z] = hexPosition(q + c0, r + r0, radius, spacingScale)
            
            // Check if this is an edge position
            const isEdge = q === 0 || q === cols - 1 || r === 0 || r === rows - 1
            
            if (isEdge) {
              // For each edge tile, place empty bases in all 6 hexagonal directions
              // that would be outside the board
              hexDirections.forEach(([dq, dr], dirIndex) => {
                const neighborQ = q + dq
                const neighborR = r + dr
                
                // Check if this neighbor would be outside the board
                const isOutside = neighborQ < 0 || neighborQ >= cols || neighborR < 0 || neighborR >= rows
                
                if (isOutside) {
                  // Place empty base at this neighbor position
                  const [neighborX, neighborY, neighborZ] = hexPosition(
                    neighborQ + c0, 
                    neighborR + r0, 
                    radius, 
                    spacingScale
                  )
                  
                  pillarBases.push(
                    <mesh key={`edge-${q}-${r}-${dirIndex}`} position={[neighborX, neighborY, neighborZ]}>
                      <cylinderGeometry args={[1.0, 1.0, 0.1, 6]} />
                      <meshStandardMaterial color="#1a4d1a" />
                    </mesh>
                  )
                }
              })
            }
          }
        }
        
        return pillarBases
      })()}
    </>
  )
}
