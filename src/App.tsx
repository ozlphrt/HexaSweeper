import React, { useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import { FpsCounter } from './FpsCounter'
import { useStore } from './store'
import * as THREE from 'three'

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
      <div className="game-status">
        <div className="status-item">
          <span className="label">Status:</span>
          <span className={`value status-${gameStatus}`}>
            {gameStatus === 'playing' ? 'Playing' : 
             gameStatus === 'won' ? 'You Won!' : 'Game Over'}
          </span>
        </div>
      </div>
      
      {/* Fancy Glassmorphism Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar glassmorphism">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text large-font">
          {progress.toFixed(1)}% completed ({flaggedMines} / {mineCount} flagged)
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
      </div>
    </div>
  )
}

export default function App() {
  const { isRevealing, processRevealQueue, resetGame } = useStore()

  // Process reveal queue with timing
  useEffect(() => {
    if (isRevealing) {
      const interval = setInterval(() => {
        processRevealQueue()
      }, 30) // 30ms delay between each cell reveal (much faster)

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
        camera={{ position: [1.76, 8.78, 23.95], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#2c3e50']} />
        <Scene />
        <OrbitControls 
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
        />
      </Canvas>
      
      <FpsCounter />
      <GameUI />
      
      <div className="credits">
        Hexagrid Minesweeper
      </div>
    </>
  )
}