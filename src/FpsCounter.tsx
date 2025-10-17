import React, { useState, useEffect } from 'react'

export function FpsCounter() {
  const [fps, setFps] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [lastTime, setLastTime] = useState(performance.now())

  useEffect(() => {
    let animationId: number

    const updateFPS = (currentTime: number) => {
      setFrameCount(prev => prev + 1)
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)))
        setFrameCount(0)
        setLastTime(currentTime)
      }
      
      animationId = requestAnimationFrame(updateFPS)
    }

    animationId = requestAnimationFrame(updateFPS)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [frameCount, lastTime])

  return (
    <div className="fps-counter">
      {fps} FPS
    </div>
  )
}