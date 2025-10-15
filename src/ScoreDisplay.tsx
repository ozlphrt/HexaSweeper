import React from 'react'
import { useStore } from './store'

export function ScoreDisplay() {
  const score = useStore(s => s.score)
  const scoreBreakdown = useStore(s => s.getScoreBreakdown())

  return (
    <div className="score-display">
      <div className="score-main">
        <h2>Score: {score}</h2>
      </div>
      
      <div className="score-breakdown">
        <div className="breakdown-item">
          <span className="label">Void Drops:</span>
          <span className="value">{scoreBreakdown.voidDrops}</span>
        </div>
        <div className="breakdown-item">
          <span className="label">Valid Moves:</span>
          <span className="value">{scoreBreakdown.validMoves}</span>
        </div>
        <div className="breakdown-item">
          <span className="label">Blocked Moves:</span>
          <span className="value">{scoreBreakdown.blockedMoves}</span>
        </div>
        <div className="breakdown-item">
          <span className="label">Chain Reactions:</span>
          <span className="value">{scoreBreakdown.chainReactions}</span>
        </div>
        <div className="breakdown-item total">
          <span className="label">Total Moves:</span>
          <span className="value">{scoreBreakdown.totalMoves}</span>
        </div>
      </div>

    </div>
  )
}
