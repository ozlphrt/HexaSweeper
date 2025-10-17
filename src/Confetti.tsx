import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ConfettiProps {
  position: [number, number, number]
  isActive: boolean
  onComplete?: () => void
}

interface ConfettiParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotation: THREE.Vector3
  rotationVelocity: THREE.Vector3
  color: THREE.Color
  life: number
  maxLife: number
}

export function Confetti({ position, isActive, onComplete }: ConfettiProps) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<ConfettiParticle[]>([])
  const startTimeRef = useRef<number>(0)
  const hasInitialized = useRef<boolean>(false)

  // Initialize particles when isActive becomes true
  useEffect(() => {
    if (isActive && !hasInitialized.current) {
      const particleCount = 50
      const newParticles: ConfettiParticle[] = []
      
      for (let i = 0; i < particleCount; i++) {
        // Random colors for confetti
        const colors = [
          new THREE.Color('#ff6b6b'), // Red
          new THREE.Color('#4ecdc4'), // Teal
          new THREE.Color('#45b7d1'), // Blue
          new THREE.Color('#96ceb4'), // Green
          new THREE.Color('#feca57'), // Yellow
          new THREE.Color('#ff9ff3'), // Pink
          new THREE.Color('#54a0ff'), // Light Blue
          new THREE.Color('#5f27cd'), // Purple
        ]
        
        newParticles.push({
          position: new THREE.Vector3(
            position[0] + (Math.random() - 0.5) * 2,
            position[1] + Math.random() * 2,
            position[2] + (Math.random() - 0.5) * 2
          ),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 8
          ),
          rotation: new THREE.Vector3(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          rotationVelocity: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          ),
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 2 + Math.random() * 2
        })
      }
      
      particlesRef.current = newParticles
      startTimeRef.current = Date.now()
      hasInitialized.current = true
    }
  }, [isActive, position])

  // Create confetti particles
  const particles = useMemo(() => {
    return particlesRef.current
  }, [isActive])

  useFrame((state, delta) => {
    if (!isActive || !groupRef.current || particlesRef.current.length === 0) return

    const elapsed = (Date.now() - startTimeRef.current) / 1000
    
    // Update particles
    particlesRef.current.forEach((particle, index) => {
      // Update life
      particle.life += delta
      
      // Apply gravity
      particle.velocity.y -= 9.8 * delta
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(delta))
      
      // Update rotation
      particle.rotation.add(particle.rotationVelocity.clone().multiplyScalar(delta))
      
      // Fade out over time
      const lifeRatio = particle.life / particle.maxLife
      if (lifeRatio >= 1) {
        particle.life = particle.maxLife
      }
    })
    
    // Check if all particles are done
    const allDone = particlesRef.current.every(p => p.life >= p.maxLife)
    if (allDone && elapsed > 1) {
      onComplete?.()
    }
  })

  if (!isActive || particlesRef.current.length === 0) return null

  return (
    <group ref={groupRef}>
      {particlesRef.current.map((particle, index) => {
        const lifeRatio = particle.life / particle.maxLife
        const opacity = Math.max(0, 1 - lifeRatio)
        
        return (
          <mesh
            key={index}
            position={particle.position}
            rotation={particle.rotation}
          >
            <planeGeometry args={[0.1, 0.1]} />
            <meshBasicMaterial
              color={particle.color}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}
