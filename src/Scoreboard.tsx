import React from 'react'
import { useStore } from './store'

interface CircularProgressProps {
  percentage: number
  color: string
  icon: string
  label: string
  current: number
  total: number
}

function CircularProgress({ percentage, color, icon, label, current, total }: CircularProgressProps) {
  const radius = 60
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="circular-progress-container">
      <div className="progress-ring">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="progress-ring-svg"
        >
          {/* Background circle */}
          <circle
            stroke="rgba(255, 255, 255, 0.1)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="progress-ring-circle"
          />
        </svg>
        <div className="progress-content">
          <div className="progress-percentage">
            <div className="progress-number">{Math.round(percentage)}</div>
            <div className="progress-percent">%</div>
          </div>
        </div>
      </div>
      <div className="progress-info">
        <div className="progress-label">{label}</div>
        <div className="progress-count">{current}/{total}</div>
      </div>
    </div>
  )
}

export function Scoreboard() {
  const { cellStates, mineCount, pillarConfigs, gameStatus, resetGame, audioEnabled, toggleAudio } = useStore()
  
  // Calculate mine flagging progress
  const totalMines = mineCount
  const flaggedMines = Object.values(cellStates).filter(cell => 
    cell.isMine && cell.isFlagged
  ).length
  const mineProgress = totalMines > 0 ? (flaggedMines / totalMines) * 100 : 0

  // Calculate exploration progress (white tiles flipped)
  const totalCells = pillarConfigs.length
  const revealedCells = Object.values(cellStates).filter(cell => 
    cell.isRevealed && !cell.isMine
  ).length
  const explorationProgress = totalCells > 0 ? (revealedCells / (totalCells - totalMines)) * 100 : 0

  return (
    <div className="scoreboard">
      <div className="progress-container">
        <CircularProgress
          percentage={mineProgress}
          color="#ff6b6b"
          icon=""
          label="Mine Hunt"
          current={flaggedMines}
          total={totalMines}
        />
        
        <CircularProgress
          percentage={explorationProgress}
          color="#4ecdc4"
          icon=""
          label="Exploration"
          current={revealedCells}
          total={totalCells - totalMines}
        />
      </div>

      {/* Game Controls */}
      <div className="scoreboard-controls">
          <button 
            className="new-game-button glassmorphism"
            onClick={resetGame}
          >
            Reset
          </button>
        
        <button 
          className="audio-toggle-button glassmorphism"
          onClick={toggleAudio}
          title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Mobile Instructions */}
      <div className="mobile-instructions">
        <div className="mobile-hint">Tap to reveal • Long-press to flag</div>
      </div>

    </div>
  )
}
