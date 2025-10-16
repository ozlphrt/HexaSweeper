import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import { FpsCounter } from './FpsCounter'
import { useStore } from './store'
import { soundManager } from './SoundManager'

import * as THREE from 'three'

// Confetti particle component for celebration
function ConfettiParticle({ position, velocity, color }: { position: [number, number, number], velocity: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [life, setLife] = useState(1.0)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Update position with gravity
      meshRef.current.position.x += velocity[0] * delta
      meshRef.current.position.y += velocity[1] * delta
      meshRef.current.position.z += velocity[2] * delta
      
      // Apply gravity
      velocity[1] -= 9.8 * delta
      
      // Rotate the particle
      meshRef.current.rotation.x += delta * 2
      meshRef.current.rotation.y += delta * 1.5
      meshRef.current.rotation.z += delta * 1
      
      // Fade out over time
      setLife(prev => Math.max(0, prev - delta * 0.5))
      if (meshRef.current.material) {
        (meshRef.current.material as THREE.MeshBasicMaterial).opacity = life
      }
    }
  })
  
  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial color={color} transparent opacity={life} />
    </mesh>
  )
}

// Celebration component
function Celebration() {
  const { gameStatus } = useStore()
  const [particles, setParticles] = useState<Array<{ id: number, position: [number, number, number], velocity: [number, number, number], color: string }>>([])
  const [showCelebration, setShowCelebration] = useState(false)
  
  useEffect(() => {
    if (gameStatus === 'won' && !showCelebration) {
      setShowCelebration(true)
      
      // Play victory sound
      soundManager.playVictory()
      
      // Create confetti particles
      const newParticles = []
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
      
      for (let i = 0; i < 100; i++) {
        newParticles.push({
          id: i,
          position: [
            (Math.random() - 0.5) * 20,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 20
          ] as [number, number, number],
          velocity: [
            (Math.random() - 0.5) * 10,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 10
          ] as [number, number, number],
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      }
      
      setParticles(newParticles)
      
      // Hide celebration after 5 seconds
      setTimeout(() => {
        setShowCelebration(false)
        setParticles([])
      }, 5000)
    }
  }, [gameStatus, showCelebration])
  
  if (!showCelebration) return null
  
  return (
    <>
      {particles.map(particle => (
        <ConfettiParticle
          key={particle.id}
          position={particle.position}
          velocity={particle.velocity}
          color={particle.color}
        />
      ))}
    </>
  )
}

// Debug controls for lighting
function LightingDebugControls({ onLightChange }: { onLightChange: (rimLight1: any, rimLight2: any, sunlight: any) => void }) {
  const { sunlight, ambientLight, setSunlight, setAmbientLight } = useStore()
  const [rimLight1, setRimLight1] = useState({ x: -10, y: 10, z: -10, intensity: 0.3 })
  const [rimLight2, setRimLight2] = useState({ x: -8, y: 12, z: 20, intensity: 0.25 })
  const [sunlightPos, setSunlightPos] = useState({ x: 10, y: 20, z: 10, intensity: sunlight })
  
  // Notify parent of light changes
  React.useEffect(() => {
    onLightChange(rimLight1, rimLight2, sunlightPos)
  }, [rimLight1, rimLight2, sunlightPos, onLightChange])
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: 1000,
      border: '2px solid #fff',
      minWidth: '250px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>Lighting Debug</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Sunlight: {sunlight.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={sunlight}
          onChange={(e) => setSunlight(parseFloat(e.target.value))}
          style={{ width: '200px' }}
        />
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Ambient: {ambientLight.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={ambientLight}
          onChange={(e) => setAmbientLight(parseFloat(e.target.value))}
          style={{ width: '200px' }}
        />
      </div>
      
      <h5 style={{ margin: '10px 0 5px 0', color: '#ffd700' }}>Sunlight (Main Light)</h5>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>X: {sunlightPos.x.toFixed(1)}</label>
        <input
          type="range"
          min="-20"
          max="20"
          step="0.5"
          value={sunlightPos.x}
          onChange={(e) => setSunlightPos({...sunlightPos, x: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Y: {sunlightPos.y.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="30"
          step="0.5"
          value={sunlightPos.y}
          onChange={(e) => setSunlightPos({...sunlightPos, y: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Z: {sunlightPos.z.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="30"
          step="0.5"
          value={sunlightPos.z}
          onChange={(e) => setSunlightPos({...sunlightPos, z: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Intensity: {sunlightPos.intensity.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={sunlightPos.intensity}
          onChange={(e) => {
            const newIntensity = parseFloat(e.target.value)
            setSunlightPos({...sunlightPos, intensity: newIntensity})
            setSunlight(newIntensity)
          }}
          style={{ width: '200px' }}
        />
      </div>
      
      <h5 style={{ margin: '10px 0 5px 0', color: '#4a90e2' }}>Rim Light 1 (Blue)</h5>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>X: {rimLight1.x.toFixed(1)}</label>
        <input
          type="range"
          min="-20"
          max="20"
          step="0.5"
          value={rimLight1.x}
          onChange={(e) => setRimLight1({...rimLight1, x: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Y: {rimLight1.y.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="25"
          step="0.5"
          value={rimLight1.y}
          onChange={(e) => setRimLight1({...rimLight1, y: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Z: {rimLight1.z.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="30"
          step="0.5"
          value={rimLight1.z}
          onChange={(e) => setRimLight1({...rimLight1, z: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Intensity: {rimLight1.intensity.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={rimLight1.intensity}
          onChange={(e) => setRimLight1({...rimLight1, intensity: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      
      <h5 style={{ margin: '10px 0 5px 0', color: '#e2a04a' }}>Rim Light 2 (Orange)</h5>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>X: {rimLight2.x.toFixed(1)}</label>
        <input
          type="range"
          min="-20"
          max="20"
          step="0.5"
          value={rimLight2.x}
          onChange={(e) => setRimLight2({...rimLight2, x: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Y: {rimLight2.y.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="25"
          step="0.5"
          value={rimLight2.y}
          onChange={(e) => setRimLight2({...rimLight2, y: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '5px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Z: {rimLight2.z.toFixed(1)}</label>
        <input
          type="range"
          min="5"
          max="30"
          step="0.5"
          value={rimLight2.z}
          onChange={(e) => setRimLight2({...rimLight2, z: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '2px' }}>Intensity: {rimLight2.intensity.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={rimLight2.intensity}
          onChange={(e) => setRimLight2({...rimLight2, intensity: parseFloat(e.target.value)})}
          style={{ width: '200px' }}
        />
      </div>
      
      <button 
        onClick={() => {
          console.log('Sunlight:', sunlightPos)
          console.log('Rim Light 1:', rimLight1)
          console.log('Rim Light 2:', rimLight2)
          alert(`Sunlight: [${sunlightPos.x}, ${sunlightPos.y}, ${sunlightPos.z}], intensity: ${sunlightPos.intensity}\nRim Light 1: [${rimLight1.x}, ${rimLight1.y}, ${rimLight1.z}], intensity: ${rimLight1.intensity}\nRim Light 2: [${rimLight2.x}, ${rimLight2.y}, ${rimLight2.z}], intensity: ${rimLight2.intensity}`)
        }}
        style={{
          background: '#4fc3f7',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Copy Values
      </button>
    </div>
  )
}



// Component to set initial camera position
function CameraInitializer() {
  const controlsRef = useRef<any>(null)
  
  useEffect(() => {
    if (controlsRef.current) {
      // Set camera to our preferred position
      controlsRef.current.object.position.set(2.21, 13.90, 22.98)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enableDolly={true}
      enablePan={true}
      enableRotate={true}
      target={[0, 0, 0]}
      mouseButtons={{
        LEFT: 0,    // Rotate (drag)
        MIDDLE: 1,  // Zoom/Dolly
        RIGHT: 2    // Pan (drag)
      }}
      touches={{
        ONE: 0,     // Rotate (drag)
        TWO: 1      // Zoom/Dolly
      }}
      // Smooth continuous zoom settings
      zoomSpeed={1.0}
      dollySpeed={1.0}
      enableDamping={true}
      dampingFactor={0.05}
      enableSmoothZoom={true}
    />
  )
}


function GameUI() {
  const { gameStatus, mineCount, flagCount, cellStates } = useStore()
  
  // Calculate progress
  const totalCells = Object.keys(cellStates).length
  const revealedCells = Object.values(cellStates).filter(cell => cell.isRevealed && !cell.isMine).length
  const safeCells = totalCells - mineCount
  
  // Calculate flagged mines (correctly flagged)
  const flaggedMines = Object.values(cellStates).filter(cell => cell.isFlagged && cell.isMine).length
  const progress = mineCount > 0 ? (flaggedMines / mineCount) * 100 : 0

  return (
    <div className="game-ui">
      {/* Fancy Glassmorphism Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar glassmorphism">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text large-font">
          <span className="progress-box">{progress.toFixed(1)}%</span>
          <span className="progress-box">({flaggedMines}/{mineCount})</span>
        </div>
      </div>
      
                  <div className="game-instructions">
                    Left: Reveal • Right: Flag • Drag: Camera • R: Restart
                  </div>
    </div>
  )
}



function DebugControls() {
  const { debugCameraPosition } = useStore()
  
  return (
    <div className="debug-controls">
      <h4>Camera Position (Live)</h4>
      
      <div className="control-section">
        <h5>Current Camera Position</h5>
        <div className="control-group">
          <label>X: {debugCameraPosition.x.toFixed(2)}</label>
        </div>
        <div className="control-group">
          <label>Y: {debugCameraPosition.y.toFixed(2)}</label>
        </div>
        <div className="control-group">
          <label>Z: {debugCameraPosition.z.toFixed(2)}</label>
        </div>
        <div className="control-group">
          <label>Distance: {Math.sqrt(debugCameraPosition.x**2 + debugCameraPosition.y**2 + debugCameraPosition.z**2).toFixed(2)}</label>
        </div>
        <div className="control-group">
          <button onClick={() => {
            const position = `[${debugCameraPosition.x.toFixed(2)}, ${debugCameraPosition.y.toFixed(2)}, ${debugCameraPosition.z.toFixed(2)}]`
            navigator.clipboard.writeText(position)
            alert(`Camera position copied to clipboard: ${position}`)
          }}>
            Copy Position
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { isRevealing, processRevealQueue, resetGame } = useStore()
  

  // Process reveal queue with flooding animation
  useEffect(() => {
    if (isRevealing) {
      // Process cells with flooding effect - starts fast, then spreads outward
      const interval = setInterval(() => {
        processRevealQueue()
      }, 40) // 40ms delay for better performance

      return () => clearInterval(interval)
    }
  }, [isRevealing, processRevealQueue])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        resetGame()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [resetGame])




  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.21, 13.90, 22.98], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#2c3e50']} />
        <Scene />
        <CameraInitializer />
        <Celebration />
      </Canvas>
      
      <FpsCounter />
      <GameUI />
      
      <div className="credits">
        Hexagrid Minesweeper
      </div>
      
    </>
  )
}