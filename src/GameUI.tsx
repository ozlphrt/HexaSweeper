import React from 'react'
import { useStore } from './store'

export function GameUI() {
  const {
    gameStatus,
    difficulty,
    config,
    flaggedCount,
    getElapsedTime,
    stats,
    setDifficulty,
    startNewGame,
    resetGame
  } = useStore()
  
  const elapsedTime = getElapsedTime()
  const remainingMines = config.mines - flaggedCount
  
  const getStatusMessage = () => {
    switch (gameStatus) {
      case 'waiting':
        return 'Click a cell to start!'
      case 'playing':
        return 'Find all the mines!'
      case 'won':
        return `🎉 You won in ${elapsedTime}s!`
      case 'lost':
        return '💥 Game Over!'
      default:
        return ''
    }
  }
  
  const getStatusColor = () => {
    switch (gameStatus) {
      case 'won':
        return '#27ae60'
      case 'lost':
        return '#e74c3c'
      default:
        return '#3498db'
    }
  }
  
  return (
    <div className="game-ui">
      {/* Main game info */}
      <div className="game-info">
        <h1>Minesweeper 3D</h1>
        <div className="status-message" style={{ color: getStatusColor() }}>
          {getStatusMessage()}
        </div>
      </div>
      
      {/* Game controls */}
      <div className="game-controls">
        <div className="difficulty-selector">
          <label>Difficulty:</label>
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value as any)}
            disabled={gameStatus === 'playing'}
          >
            <option value="beginner">Beginner (9×9, 10 mines)</option>
            <option value="intermediate">Intermediate (16×16, 40 mines)</option>
            <option value="expert">Expert (16×30, 99 mines)</option>
          </select>
        </div>
        
        <button 
          className="restart-button"
          onClick={() => {
            resetGame()
            startNewGame()
          }}
        >
          {gameStatus === 'waiting' ? 'New Game' : 'Restart'}
        </button>
      </div>
      
      {/* Game stats */}
      <div className="game-stats">
        <div className="stat-item">
          <span className="stat-label">Time:</span>
          <span className="stat-value">{elapsedTime}s</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Mines:</span>
          <span className="stat-value">{remainingMines}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Flagged:</span>
          <span className="stat-value">{flaggedCount}</span>
        </div>
      </div>
      
      {/* Game statistics */}
      <div className="game-statistics">
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Games Played:</span>
            <span className="stat-value">{stats.gamesPlayed}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Games Won:</span>
            <span className="stat-value">{stats.gamesWon}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Win Rate:</span>
            <span className="stat-value">
              {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
            </span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Best Time:</span>
            <span className="stat-value">
              {stats.bestTime ? `${Math.floor(stats.bestTime / 1000)}s` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="instructions">
        <h3>How to Play</h3>
        <ul>
          <li><strong>Left Click:</strong> Reveal a cell</li>
          <li><strong>Right Click:</strong> Flag/unflag a cell</li>
          <li><strong>Numbers:</strong> Show adjacent mine count</li>
          <li><strong>Goal:</strong> Reveal all non-mine cells</li>
        </ul>
      </div>
    </div>
  )
}
