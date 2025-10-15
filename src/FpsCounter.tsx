import React, { useRef, useEffect, useState } from 'react'

export function FpsCounter() {
  const [fps, setFps] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(Date.now())
  const animationId = useRef<number>()

  useEffect(() => {
    const updateFps = () => {
      frameCount.current++
      const now = Date.now()
      const deltaTime = now - lastTime.current

      if (deltaTime >= 1000) { // Update every second
        const currentFps = Math.round((frameCount.current * 1000) / deltaTime)
        setFps(currentFps)
        frameCount.current = 0
        lastTime.current = now
      }

      animationId.current = requestAnimationFrame(updateFps)
    }

    animationId.current = requestAnimationFrame(updateFps)

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current)
      }
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '14px',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      FPS: {fps}
    </div>
  )
}
