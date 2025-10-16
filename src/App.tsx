import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import { FpsCounter } from './FpsCounter'
import { useStore } from './store'
import * as THREE from 'three'

// Debug controls for text positioning
function TextPositionDebugControls() {
  const { debugTextOffset, setDebugTextOffset } = useStore()
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: 1000,
      border: '2px solid #fff'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4fc3f7' }}>Text Position Debug</h4>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>X Offset: {debugTextOffset.x.toFixed(3)}</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={debugTextOffset.x}
          onChange={(e) => setDebugTextOffset({ ...debugTextOffset, x: parseFloat(e.target.value) })}
          style={{ width: '150px' }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Y Offset: {debugTextOffset.y.toFixed(3)}</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={debugTextOffset.y}
          onChange={(e) => setDebugTextOffset({ ...debugTextOffset, y: parseFloat(e.target.value) })}
          style={{ width: '150px' }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Z Offset: {debugTextOffset.z.toFixed(3)}</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={debugTextOffset.z}
          onChange={(e) => setDebugTextOffset({ ...debugTextOffset, z: parseFloat(e.target.value) })}
          style={{ width: '150px' }}
        />
      </div>
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
  const progress = safeCells > 0 ? (revealedCells / safeCells) * 100 : 0
  
  // Calculate flagged mines (correctly flagged)
  const flaggedMines = Object.values(cellStates).filter(cell => cell.isFlagged && cell.isMine).length

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
      </Canvas>
      
      <FpsCounter />
      <GameUI />
      
      <div className="credits">
        Hexagrid Minesweeper
      </div>
      
    </>
  )
}