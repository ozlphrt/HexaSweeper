import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

import { useStore } from './store'
import { soundManager } from './SoundManager'
import { DigitalNumber } from './DigitalNumber'

// Preload the flag GLTF model to prevent first-flag flickering
// Use import.meta.env.BASE_URL to respect Vite's base path configuration
const FLAG_MODEL_PATH = `${import.meta.env.BASE_URL}low_poly_golf_flag_animated/scene.gltf`
useGLTF.preload(FLAG_MODEL_PATH)


// Helper function to get neighboring cells in hexagonal grid
// Optimized: Use Map for O(1) lookup instead of O(n) array.some()
function getNeighbors(key: string, pillarMap: Map<string, { key: string, pos: [number, number, number], height: number }>): string[] {
  // Extract coordinates from key (format: "p-q-r")
  const parts = key.split('-')
  if (parts.length !== 3) return []
  
  const q = parseInt(parts[1])
  const r = parseInt(parts[2])
  
  // Hexagonal neighbors (6 directions)
  const neighborOffsets = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
  ]
  
  const neighbors: string[] = []
  neighborOffsets.forEach(([dq, dr]) => {
    const neighborKey = `p-${q + dq}-${r + dr}`
    if (pillarMap.has(neighborKey)) {
      neighbors.push(neighborKey)
    }
  })
  
  return neighbors
}


// Flag component for 3D flag models
function Flag({ position, scale = 1, color = "#ff6b6b" }: { position: [number, number, number], scale?: number, color?: string }) {
  const { scene, animations } = useGLTF(FLAG_MODEL_PATH)
  const { debugFlagRotation, debugFlagOffset } = useStore()
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  
  // Create a unique instance for this flag
  const flagInstance = React.useMemo(() => {
    const instance = scene.clone()
    
    // Enable shadows and apply color to all meshes in the flag
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        // Apply the color to the flag material
        if (child.material) {
          child.material = child.material.clone()
          
          // Check if this is the pole (usually named differently or has different geometry)
          // For now, we'll use a simple heuristic: if the mesh is tall and thin, it's likely the pole
          const boundingBox = new THREE.Box3().setFromObject(child)
          const size = boundingBox.getSize(new THREE.Vector3())
          const isPole = size.y > size.x && size.y > size.z && size.y > 0.5
          
          if (isPole) {
            // Make the pole white (same as white tiles)
            child.material.color.set("#ffffff")
          } else {
            // Make the flag red
            child.material.color.set(color)
          }
        }
      }
    })
    
    // Ensure the instance has its own animation mixer
    if (animations && animations.length > 0) {
      const mixer = new THREE.AnimationMixer(instance)
      mixerRef.current = mixer
      const action = mixer.clipAction(animations[0])
      action.play()
      
      // Store the mixer on the instance for cleanup
      ;(instance as any).mixer = mixer
    }
    return instance
  }, [scene, animations, color])
  
  // PERFORMANCE: Throttle animation updates more aggressively
  const lastAnimationUpdate = useRef(0)
  useFrame((state, delta) => {
    // Skip if mixer is null or stopped
    if (!mixerRef.current) return
    
    // PERFORMANCE: Throttle to ~30fps for animations (flags don't need 60fps)
    const now = performance.now()
    if (now - lastAnimationUpdate.current < 33) return // ~30fps max
    lastAnimationUpdate.current = now
    
    mixerRef.current.update(delta)
  })
  
  // Cleanup: stop animation mixer when flag is removed (component unmounts)
  React.useEffect(() => {
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        if (flagInstance) {
          mixerRef.current.uncacheRoot(flagInstance)
        }
        mixerRef.current = null
      }
    }
  }, [flagInstance])
  
  return (
    <group 
      ref={groupRef} 
      position={[
        position[0] + debugFlagOffset.x, 
        position[1] + debugFlagOffset.y, 
        position[2] + debugFlagOffset.z
      ]} 
      rotation={[debugFlagRotation.x, debugFlagRotation.y, debugFlagRotation.z]}
      scale={scale}
      castShadow
    >
      <primitive object={flagInstance} castShadow />
    </group>
  )
}

type Props = {
  position: [number, number, number]
  height: number
  radius: number
  allPillars: { key: string, pos: [number, number, number], height: number }[]
  pillarMap: Map<string, { key: string, pos: [number, number, number], height: number }>
  pillarKey: string
  sharedGeometry: THREE.CylinderGeometry
}

export function Pillar({ position, height, radius, allPillars, pillarMap, pillarKey, sharedGeometry }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Use selectors to only subscribe to specific store values, preventing unnecessary re-renders
  const cellState = useStore(state => state.cellStates[pillarKey])
  // CRITICAL: Don't subscribe to addToRevealQueue - call it directly from store to avoid stale closures
  const toggleFlag = useStore(state => state.toggleFlag)
  const gameStatus = useStore(state => state.gameStatus)
  // DO NOT subscribe to debugTextRotation/Offset/Scale - read via refs in useFrame to prevent re-renders
  // PERFORMANCE: Only subscribe to setHoveredTile (needed for callbacks), read others directly from store
  const setHoveredTile = useStore(state => state.setHoveredTile)
  
  // PERFORMANCE: Read these directly from store when needed instead of subscribing (reduces re-renders)
  // These values don't change often and don't need reactive updates
  
  // DO NOT subscribe to debug values - read directly from store in useFrame to prevent re-renders
  
  // Animation state
  const [isFlipping, setIsFlipping] = useState(false)
  const [wasRevealed, setWasRevealed] = useState(false)
  
  // Click vs drag detection
  // CRITICAL: Use refs instead of state to avoid React state update timing issues
  // State updates are async, which can cause values to be stale in event handlers
  const isDraggingRef = useRef(false)
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragThreshold = typeof window !== 'undefined' && window.innerWidth <= 768 ? 8 : 10 // Higher threshold on mobile, more lenient on desktop to prevent accidental drags
  const flipStartTime = useRef<number>(0)
  const flipDuration = 0.3 // 300ms flip duration
  
  // Long press detection for mobile flagging (right-click equivalent)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressDuration = 500 // 500ms for long press
  const isLongPress = useRef(false)
  // Track active touches for multi-touch detection
  const activeTouchesRef = useRef<Set<number>>(new Set())
  
  // Game over falling animation state
  const [isFalling, setIsFalling] = useState(false)
  const [gameOverFallProgress, setGameOverFallProgress] = useState(0)
  const [gameOverFallDelay, setGameOverFallDelay] = useState(0)
  // CRITICAL: Use ref for fall progress to avoid stale state in animation loop
  const gameOverFallProgressRef = useRef(0)
  const fallDistance = -10 // Fall 10 units down
  
  // Simple ref for text group to update position/rotation
  const textGroupRef = useRef<THREE.Group>(null)
  
  // Track if text was ever shown - once true, never becomes false (except on reset)
  // This ensures text stays visible even if cellState is temporarily undefined during re-renders
  const textWasShownRef = useRef(false)
  const neighborCountRef = useRef<number | null>(null)
  const neighborCountStringRef = useRef<string>('') // Start empty, not '0' - only set when we have valid data
  
  // Store offset/rotation/scale/font in refs - updated in useFrame from store directly (no subscriptions)
  const offsetRef = useRef({ x: 0, y: 0, z: 0 })
  const rotationRef = useRef({ x: 0, y: 0, z: 0 })
  const scaleRef = useRef(0.72)
  const fontRef = useRef<string>('/fonts/helvetiker_bold.typeface.json')
  
  // Check if text should be displayed
  const shouldShowText = cellState && cellState.isRevealed && !cellState.isMine && cellState.neighborMineCount > 0
  
  // Once text should be shown, mark it as shown forever and store the count
  // CRITICAL: Only set once - lock in the value when first shown
  // IMPORTANT: Update refs BEFORE text becomes visible to prevent showing '0'
  if (cellState?.isRevealed && !cellState?.isMine && cellState?.neighborMineCount !== undefined && cellState.neighborMineCount > 0) {
    // Always update the refs when we have valid data (not just first time)
    // This ensures we have the correct value before text becomes visible
    neighborCountRef.current = cellState.neighborMineCount
    neighborCountStringRef.current = String(cellState.neighborMineCount)
    if (!textWasShownRef.current) {
      textWasShownRef.current = true
    }
  }
  
  // Update text position/rotation/size in useFrame - read directly from store, NO subscriptions
  // CRITICAL: Reading from store.getState() in useFrame prevents component re-renders
  // This ensures Text component never unmounts when offset sliders change
  // PERFORMANCE: Only update when text is visible or animating (isFalling)
  // OPTIMIZATION: Skip useFrame entirely if no text will ever be shown
  const lastDebugUpdate = useRef(0)
  const textUpdateSkipped = useRef(false)
  // Track last known values to avoid unnecessary updates
  const lastTextPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const lastTextRotationRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const lastTextScaleRef = useRef<number | null>(null)
  const textStableRef = useRef(false) // Track if text is stable and doesn't need updates
  
  useFrame(() => {
    // CRITICAL: Skip entirely if text was never shown and won't be shown
    if (!textWasShownRef.current && !neighborCountStringRef.current) {
      if (!textUpdateSkipped.current) {
        textUpdateSkipped.current = true
        if (textGroupRef.current) {
          textGroupRef.current.visible = false
        }
      }
      return
    }
    
    // CRITICAL: Hide all text when game is over (won or lost)
    const currentGameStatus = useStore.getState().gameStatus
    if ((currentGameStatus === 'won' || currentGameStatus === 'lost')) {
      if (textGroupRef.current && textGroupRef.current.visible) {
        textGroupRef.current.visible = false
        textStableRef.current = false
      }
      return
    }
    
    // CRITICAL: Hide text immediately when tile starts falling
    if (isFalling) {
      if (textGroupRef.current && textGroupRef.current.visible) {
        textGroupRef.current.visible = false
        textStableRef.current = false
      }
      return
    }
    
    // Early return if no text to display
    if (!neighborCountStringRef.current || neighborCountRef.current === null) {
      if (textGroupRef.current && textGroupRef.current.visible) {
        textGroupRef.current.visible = false
        textStableRef.current = false
      }
      return
    }
    
    if (!textGroupRef.current) return
    
    // PERFORMANCE: Throttle debug value reads - only read every 200ms (debug sliders don't change often)
    const now = performance.now()
    let valuesChanged = false
    if (now - lastDebugUpdate.current > 200) {
      const storeState = useStore.getState()
      const newOffset = storeState.debugTextOffset
      const newRotation = storeState.debugTextRotation
      const newScale = storeState.debugTextScale
      
      // Check if values actually changed
      if (
        offsetRef.current.x !== newOffset.x ||
        offsetRef.current.y !== newOffset.y ||
        offsetRef.current.z !== newOffset.z ||
        rotationRef.current.x !== newRotation.x ||
        rotationRef.current.y !== newRotation.y ||
        rotationRef.current.z !== newRotation.z ||
        scaleRef.current !== newScale
      ) {
        valuesChanged = true
        offsetRef.current = newOffset
        rotationRef.current = newRotation
        scaleRef.current = newScale
        textStableRef.current = false
      }
      
      fontRef.current = storeState.debugTextFont
      lastDebugUpdate.current = now
    }
    
    // Calculate final values
    const fallY = 0 // No falling for text in normal gameplay
    const fallRot = 0
    const finalPosY = (offsetRef.current.y + fallY) * radius
    const finalScale = scaleRef.current / 0.72
    
    // PERFORMANCE: Skip update if text is stable (visible, positioned correctly, no animations)
    if (!isFalling && textStableRef.current && !valuesChanged) {
      // Verify position/scale haven't drifted (safety check)
      const currentY = textGroupRef.current.position.y
      const currentScale = textGroupRef.current.scale.x
      if (
        Math.abs(currentY - finalPosY) < 0.001 &&
        Math.abs(currentScale - finalScale) < 0.001
      ) {
        return // Text is stable, skip this frame
      }
    }
    
    // Update position/rotation/scale
    const needsVisibilityUpdate = !textGroupRef.current.visible
    textGroupRef.current.position.set(
      offsetRef.current.x * radius,
      finalPosY,
      (0.02 + offsetRef.current.z) * radius
    )
    textGroupRef.current.rotation.set(
      rotationRef.current.x + fallRot,
      rotationRef.current.y,
      rotationRef.current.z + fallRot
    )
    textGroupRef.current.scale.setScalar(finalScale)
    
    if (needsVisibilityUpdate) {
      textGroupRef.current.visible = true
    }
    
    // Mark as stable if not animating and values haven't changed
    if (!isFalling && !valuesChanged) {
      textStableRef.current = true
    }
  })
  
  // Calculate tile thickness for positioning elements
  const getTileThickness = () => {
    return 0.15
  }

  // Reset all animation states when game is reset
  // PERFORMANCE: Read gameResetTrigger directly from store instead of subscribing (reduces re-renders)
  const prevResetTrigger = useRef(useStore.getState().gameResetTrigger)
  React.useEffect(() => {
    const currentResetTrigger = useStore.getState().gameResetTrigger
    if (currentResetTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = currentResetTrigger
      setIsFlipping(false)
      setWasRevealed(false)
      setIsFalling(false)
      setGameOverFallProgress(0)
      gameOverFallProgressRef.current = 0
      setGameOverFallDelay(0)
      // Reset visibility and opacity when game resets
      if (meshRef.current) {
        meshRef.current.visible = true
        if (meshRef.current.material) {
          const material = meshRef.current.material as THREE.MeshStandardMaterial
          if (material.transparent) {
            material.opacity = 1
          }
        }
      }
      // Reset text visibility on reset
      if (textGroupRef.current && neighborCountStringRef.current) {
        textGroupRef.current.visible = true
      }
      flipStartTime.current = 0
      textWasShownRef.current = false
      neighborCountRef.current = null
      neighborCountStringRef.current = ''
      // Reset performance tracking refs
      animationSkipped.current = false
      positionVerifiedRef.current = false
      textStableRef.current = false
      textUpdateSkipped.current = false
      // Reset font ref to current store value
      fontRef.current = useStore.getState().debugTextFont
      // Hide text on reset
      if (textGroupRef.current) {
        textGroupRef.current.visible = false
      }
      // Clear long press timer on reset
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      // Clear active touches on reset
      activeTouchesRef.current.clear()
      isLongPress.current = false
      isDraggingRef.current = false
      dragStartPosRef.current = null
    }
    
    // Cleanup on unmount
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      activeTouchesRef.current.clear()
    }
  })
  
  
  
  // Use shared geometry instead of creating per-component (performance optimization)
  const hexGeometry = sharedGeometry
  
  const handlePointerDown = (event: any) => {
    // CRITICAL: Always reset dragging state at the start of each pointer down event
    isDraggingRef.current = false
    
    // Handle touch events for mobile
    if (event.pointerType === 'touch' || event.touches) {
      // Track active touches for multi-touch detection
      if (event.pointerType === 'touch' && event.pointerId !== undefined) {
        activeTouchesRef.current.add(event.pointerId)
      }
      
      // Check if this is multi-touch (more than one active touch)
      const isMultiTouch = activeTouchesRef.current.size > 1
      
      if (isMultiTouch) {
        // Multi-touch detected: allow OrbitControls to handle zoom
        // Cancel any ongoing long press
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
        isDraggingRef.current = true
        dragStartPosRef.current = null
        // Don't stop propagation - let OrbitControls handle it
        return
      } else {
        // Single touch: handle tile interaction
        event.stopPropagation()
        const touchX = event.clientX || event.touches?.[0]?.clientX
        const touchY = event.clientY || event.touches?.[0]?.clientY
        if (touchX !== undefined && touchY !== undefined) {
          dragStartPosRef.current = { x: touchX, y: touchY }
        }
        isDraggingRef.current = false
        isLongPress.current = false
        
        // Start long press timer for flagging (right-click equivalent on mobile)
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true
          if (gameStatus === 'playing' && cellState && !cellState.isRevealed) {
            toggleFlag(pillarKey)
            // Visual feedback for long press
            if (meshRef.current) {
              meshRef.current.scale.setScalar(1.15)
              // Haptic feedback if available (not supported on iOS Safari)
              try {
                if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
                  navigator.vibrate(50) // Short vibration pulse
                }
              } catch (e) {
                // Vibration API not supported (e.g., iOS Safari)
              }
              setTimeout(() => {
                if (meshRef.current) {
                  meshRef.current.scale.setScalar(1.0)
                }
              }, 200)
            }
          }
        }, longPressDuration)
        return
      }
    }
    
    // Handle mouse events (desktop)
    // CRITICAL: Always stop propagation and set dragStartPos for mouse events to ensure clicks register
    if (event.button === 0) { // Left mouse button
      event.stopPropagation() // Prevent camera rotation on click - CRITICAL for click registration
      // Note: preventDefault() not available/needed in passive event listeners (React Three Fiber)
      // CRITICAL: Always set dragStartPosRef for mouse events, even if coordinates seem undefined
      // Sometimes event.clientX/Y might be 0, but we still need to track the position
      dragStartPosRef.current = { 
        x: event.clientX ?? 0, 
        y: event.clientY ?? 0 
      }
      isDraggingRef.current = false
    } else if (event.button === 2) { // Right mouse button
      event.stopPropagation()
      dragStartPosRef.current = { 
        x: event.clientX ?? 0, 
        y: event.clientY ?? 0 
      }
      isDraggingRef.current = false
    } else if (event.button === 1) { // Middle mouse button
      event.stopPropagation()
      if (gameStatus === 'playing' && cellState && !cellState.isRevealed) {
        toggleFlag(pillarKey)
      }
    }
  }
  
  const handlePointerMove = (event: any) => {
    // Check if this is multi-touch
    const isMultiTouch = activeTouchesRef.current.size > 1
    
    if (isMultiTouch) {
      // Multi-touch: allow OrbitControls to handle zoom
      // Don't stop propagation
      return
    }
    
    // Cancel long press if user moves (it's a drag, not a click)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Only mark as dragging if we have valid coordinates and exceed threshold
    if (dragStartPosRef.current && (event.clientX !== undefined || event.touches?.[0]?.clientX !== undefined)) {
      const currentX = event.clientX ?? event.touches?.[0]?.clientX
      const currentY = event.clientY ?? event.touches?.[0]?.clientY
      
      if (currentX !== undefined && currentY !== undefined) {
        const deltaX = Math.abs(currentX - dragStartPosRef.current.x)
        const deltaY = Math.abs(currentY - dragStartPosRef.current.y)
        
        // Only mark as dragging if we exceed threshold - more lenient on desktop
        if (deltaX > dragThreshold || deltaY > dragThreshold) {
          isDraggingRef.current = true
          isLongPress.current = false
        }
      }
    }
  }
  
  const lastClickTime = useRef(0)
  
  const handlePointerUp = (event: any) => {
    // Remove touch from active set
    if (event.pointerType === 'touch' && event.pointerId !== undefined) {
      activeTouchesRef.current.delete(event.pointerId)
    }
    
    // Cancel long press timer if still active
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Check if this is multi-touch
    const isMultiTouch = activeTouchesRef.current.size > 0
    
    // Handle touch release (mobile)
    if (event.pointerType === 'touch' || event.changedTouches) {
      if (!isMultiTouch && !isDraggingRef.current && !isLongPress.current && dragStartPosRef.current) {
        // Single touch: handle tile interaction
        event.stopPropagation()
        // Reduced throttle - only 100ms to improve responsiveness
        const now = performance.now()
        if (now - lastClickTime.current < 100) {
          dragStartPosRef.current = null
          return // 100ms cooldown (reduced from 200ms)
        }
        lastClickTime.current = now
        
        // Single tap = reveal (left click equivalent)
        if (gameStatus === 'playing' && cellState && !cellState.isFlagged) {
          // Visual feedback for tap
          if (meshRef.current) {
            meshRef.current.scale.setScalar(0.95)
            setTimeout(() => {
              if (meshRef.current) {
                meshRef.current.scale.setScalar(1.0)
              }
            }, 100)
          }
          // Light haptic feedback for tap (not supported on iOS Safari)
          try {
            if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
              navigator.vibrate(10) // Very short vibration
            }
          } catch (e) {
            // Vibration API not supported (e.g., iOS Safari)
          }
          // CRITICAL: Call addToRevealQueue directly from store to avoid stale closure issues
          // AudioContext is pre-initialized on first user interaction (see App.tsx)
          useStore.getState().addToRevealQueue(pillarKey)
        }
      } else if (isMultiTouch) {
        // Still multi-touch active: allow OrbitControls to handle zoom
        isDraggingRef.current = false
        dragStartPosRef.current = null
        isLongPress.current = false
        // Don't stop propagation
      } else {
        // Reset drag state
        isDraggingRef.current = false
        dragStartPosRef.current = null
        isLongPress.current = false
      }
      return
    }
    
    // Handle mouse release (desktop)
    // Check if this was a click (small movement) or drag
    // CRITICAL: Use refs to avoid React async state update timing issues
    if (dragStartPosRef.current) {
      // Calculate drag distance
      const dragDistance = event.clientX !== undefined && event.clientY !== undefined
        ? Math.max(
            Math.abs(event.clientX - dragStartPosRef.current.x),
            Math.abs(event.clientY - dragStartPosRef.current.y)
          )
        : dragThreshold + 1 // If coordinates unavailable, treat as drag
      
      // Only register as click if drag distance is below threshold
      if (dragDistance < dragThreshold) {
        event.stopPropagation() // Prevent camera rotation on click
        // Reduced throttle - only 50ms to improve responsiveness
        const now = performance.now()
        if (now - lastClickTime.current < 50) {
          // Still reset state even if throttled
          isDraggingRef.current = false
          dragStartPosRef.current = null
          return // 50ms cooldown
        }
        lastClickTime.current = now
        
        // It's a click, not a drag
        if (event.button === 0 || event.button === undefined) { // Left click (undefined for some events)
          if (gameStatus === 'playing' && cellState && !cellState.isFlagged && !cellState.isRevealed) {
            // CRITICAL: Call addToRevealQueue directly from store to avoid stale closure issues
            // AudioContext is pre-initialized on first user interaction (see App.tsx)
            useStore.getState().addToRevealQueue(pillarKey)
          }
        } else if (event.button === 2) { // Right click
          if (gameStatus === 'playing' && cellState && !cellState.isRevealed) {
            toggleFlag(pillarKey)
          }
        }
      }
      
      // Always reset drag state after pointerUp, regardless of whether it was a click or drag
      isDraggingRef.current = false
      dragStartPosRef.current = null
    } else {
      // Reset drag state even if dragStartPosRef was null
      isDraggingRef.current = false
    }
  }
  
  // Determine cell appearance based on state and flip progress
  const getCellColor = () => {
    if (!cellState) return "#f4efe8" // Default creamy white

    // Game over state - special colors for mines and heatmap for unflipped tiles
    if (gameStatus === 'won' || gameStatus === 'lost') {
      if (cellState.isMine) {
        if (cellState.isFlagged) {
          return "#4CAF50" // Softer green for correctly flagged mines
        } else {
          return "#f44336" // Softer red for unflagged mines
        }
      }
      
      // Apply heatmap to unflipped (unrevealed) tiles based on distance to clicked mine
      // PERFORMANCE: Read clickedMinePosition directly from store instead of subscribing
      const clickedMinePosition = useStore.getState().clickedMinePosition
      if (gameStatus === 'lost' && !cellState.isRevealed && !cellState.isFlagged && clickedMinePosition) {
        // Calculate hex distance (manhattan-like distance on hex grid)
        // Extract hex coordinates from position (approximate - assumes grid spacing)
        // Find which pillar corresponds to clicked mine
        // Optimized: Try Map lookup first, fallback to find for position-based lookup
        const clickedMinePillar = pillarMap.get(clickedMinePosition[0] + '-' + clickedMinePosition[2]) || allPillars.find(p => {
          const dx = Math.abs(p.pos[0] - clickedMinePosition[0])
          const dz = Math.abs(p.pos[2] - clickedMinePosition[2])
          return dx < 0.5 && dz < 0.5 // Small threshold for matching
        })
        
        if (clickedMinePillar) {
          // Calculate hex distance using axial coordinates
          const [clickedQ, clickedR] = clickedMinePillar.key.split('-').slice(1).map(Number)
          const [currentQ, currentR] = pillarKey.split('-').slice(1).map(Number)
          
          // Hex distance in axial coordinates
          const hexDistance = (Math.abs(clickedQ - currentQ) + 
                              Math.abs(clickedQ + clickedR - currentQ - currentR) + 
                              Math.abs(clickedR - currentR)) / 2
          
          // Normalize distance (assuming max grid distance ~15-20 hex units)
          const maxDistance = 15
          const normalizedDistance = Math.min(hexDistance / maxDistance, 1)
          
          // Create heatmap: closer = vibrant red/orange, farther = orange/yellow
          // Mine red (#f44336 = rgb(244, 67, 54))
          // Hottest: One tone less saturated than mine = rgb(244, 75, 62)
          // Red (close) -> Orange -> Yellow (far, still saturated)
          let r, g, b
          if (normalizedDistance < 0.33) {
            // Close: Vibrant red (one tone less saturated than mine) to Orange
            const t = normalizedDistance / 0.33
            r = 244
            g = Math.floor(75 + (130 * t)) // 75 -> 205
            b = Math.floor(62 + (43 * t))  // 62 -> 105
          } else if (normalizedDistance < 0.66) {
            // Mid: Orange to Yellow (more saturated)
            const t = (normalizedDistance - 0.33) / 0.33
            r = 255
            g = Math.floor(205 + (50 * t))  // 205 -> 255
            b = Math.floor(105 - (55 * t))  // 105 -> 50
          } else {
            // Far: Yellow to light yellow (still somewhat saturated, not white)
            const t = (normalizedDistance - 0.66) / 0.34
            r = 255
            g = 255
            b = Math.floor(50 + (100 * t))  // 50 -> 150 (light yellow, not white)
          }
          
          return `rgb(${r}, ${g}, ${b})`
        }
      }
    }

    // During flip animation, show different colors based on flip progress
    if (isFlipping) {
      const currentTime = performance.now()
      const elapsed = (currentTime - flipStartTime.current) / 1000
      const progress = Math.min(elapsed / flipDuration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const flipRatio = easedProgress
      
      if (flipRatio < 0.5) {
        // First half of flip - show front side (unrevealed)
        if (cellState.isFlagged) return "#ff6b6b" // Red for flagged
        return "#f4efe8" // Creamy white for unrevealed
      } else {
        // Second half of flip - show back side (revealed)
        if (cellState.isMine) return "#2c3e50" // Dark blue for mine
        return "#27ae60" // Green for revealed safe cells
      }
    }

    // Normal state (not flipping)
    if (cellState.isRevealed) {
      if (cellState.isMine) {
        // In immortal mode, show black for clicked mines (prioritize over flagged)
        // PERFORMANCE: Read immortalMode directly from store instead of subscribing
        const immortalMode = useStore.getState().immortalMode
        if (immortalMode && cellState.isImmortalMine) {
          return "#000000" // Black for immortal mine
        }
        return "#2c3e50" // Dark blue for regular mine
      }
      return "#27ae60" // Green for revealed safe cells
    }
    if (cellState.isFlagged) {
      return "#ff6b6b" // Red for all flagged tiles
    }

    return "#f4efe8" // Creamy white for unrevealed
  }

  
  // Trigger flip animation when cell becomes revealed
  React.useEffect(() => {
    if (cellState?.isRevealed && !wasRevealed) {
      setIsFlipping(true)
      flipStartTime.current = performance.now()
      setWasRevealed(true)
      // Play click sound when flip starts (unless it's a mine - game over sound will play instead)
      if (!cellState.isMine && gameStatus !== 'lost') {
        soundManager.playClick()
      }
    }
  }, [cellState?.isRevealed, wasRevealed, cellState?.isMine, gameStatus])

  // Trigger falling animation when game is over
  // CRITICAL: Check gameStatus directly from store to ensure we catch changes
  const prevGameStatus = useRef(gameStatus)
  React.useEffect(() => {
    const currentGameStatus = gameStatus
    const shouldFall = (currentGameStatus === 'won' || currentGameStatus === 'lost') && 
                       cellState && 
                       cellState.isRevealed && 
                       !cellState.isMine && 
                       !isFalling
    
    // Only trigger if game status changed to won/lost and we haven't started falling yet
    if (shouldFall && (prevGameStatus.current !== 'won' && prevGameStatus.current !== 'lost')) {
      // Add random delay for staggered falling effect
      const delay = Math.random() * 2000 // 0-2 seconds delay
      setGameOverFallDelay(delay)

      setTimeout(() => {
        setIsFalling(true)
        setGameOverFallProgress(0)
        gameOverFallProgressRef.current = 0
      }, delay)
    }
    
    prevGameStatus.current = currentGameStatus
  }, [gameStatus, cellState, isFalling])


  // PERFORMANCE: Only run animation useFrame when actually animating
  // OPTIMIZATION: Use ref to track if we can skip this useFrame entirely
  const animationSkipped = useRef(false)
  const positionVerifiedRef = useRef(false) // Track if we've verified position after reveal
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    // PERFORMANCE: Skip entirely if never animated and not animating now
    if (!isFlipping && !isFalling && !wasRevealed && animationSkipped.current) {
      return
    }
    
    // PERFORMANCE: Once revealed and animations complete, verify position once then skip
    if (!isFlipping && !isFalling && wasRevealed && animationSkipped.current) {
      if (!positionVerifiedRef.current) {
        // Verify position once after reveal completes
        if (Math.abs(meshRef.current.position.y - position[1]) > 0.001) {
          meshRef.current.position.y = position[1]
        }
        positionVerifiedRef.current = true
      }
      return
    }
    
    animationSkipped.current = (!isFlipping && !isFalling)
    positionVerifiedRef.current = false // Reset when animations restart
    
    // Early return if no animations active
    if (!isFlipping && !isFalling) {
      // Ensure position is correct
      if (Math.abs(meshRef.current.position.y - position[1]) > 0.001) {
        meshRef.current.position.y = position[1]
      }
      return
    }
    
    // No press-down effect - tiles stay at original position
    meshRef.current.position.y = position[1]

    // Handle flip animation - optimized for performance
    if (isFlipping) {
      const currentTime = performance.now()
      const elapsed = (currentTime - flipStartTime.current) / 1000 // Convert to seconds
      const progress = Math.min(elapsed / flipDuration, 1)
      
      if (progress >= 1) {
        setIsFlipping(false)
        meshRef.current.rotation.x = 0 // Reset rotation
      } else {
        // Use easing function for smoother animation
        const easedProgress = 1 - Math.pow(1 - progress, 3) // Ease-out cubic
        meshRef.current.rotation.x = easedProgress * Math.PI
      }
    }

    // Handle falling animation
    if (isFalling) {
      // CRITICAL: Update ref immediately for use in same frame, then update state
      gameOverFallProgressRef.current += delta * 2 // Fall speed
      const progress = Math.min(gameOverFallProgressRef.current, 1)
      
      // Update state for React (but use ref value for animation calculations)
      setGameOverFallProgress(progress)
      
      if (progress >= 1) {
        setIsFalling(false) // Stop animation loop once complete
        // Hide the mesh when falling is complete
        if (meshRef.current) {
          meshRef.current.visible = false
        }
        // Hide text when falling completes
        if (textGroupRef.current) {
          textGroupRef.current.visible = false
        }
        return
      }

      // Apply falling motion with gravity
      const gravity = progress * progress // Quadratic fall
      meshRef.current.position.y = position[1] + (fallDistance * gravity)

      // Add some rotation during fall
      meshRef.current.rotation.z += delta * 2
      meshRef.current.rotation.x += delta * 1.5
      
      // Fade out as it falls
      if (meshRef.current.material) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial
        if (!material.transparent) {
          material.transparent = true
        }
        material.opacity = 1 - progress * 0.8 // Fade to 20% opacity, not fully transparent
      }
      
      // Hide/fade text as tile falls
      if (textGroupRef.current) {
        textGroupRef.current.visible = false // Hide text immediately when falling starts
      }
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={hexGeometry}
        onPointerOver={() => {
          setHovered(true)
          // PERFORMANCE: Only update hoveredTile if it's different (reduces store updates)
          const currentHovered = useStore.getState().hoveredTile
          if (currentHovered !== pillarKey) {
            setHoveredTile(pillarKey)
          }
        }}
        onPointerOut={() => {
          setHovered(false)
          // PERFORMANCE: Only update hoveredTile if it's this tile (reduces store updates)
          const currentHovered = useStore.getState().hoveredTile
          if (currentHovered === pillarKey) {
            setHoveredTile(null)
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          // Ensure hover state is maintained during mouse movement
          // PERFORMANCE: Only update if needed (reduces unnecessary store updates)
          if (!hovered) {
            setHovered(true)
            const currentHovered = useStore.getState().hoveredTile
            if (currentHovered !== pillarKey) {
              setHoveredTile(pillarKey)
            }
          }
          // Call the original handlePointerMove
          handlePointerMove(e)
        }}
        onPointerUp={handlePointerUp}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={getCellColor()}
          roughness={0.3}
          metalness={0.0}
        />
        
      </mesh>
      
      {/* Display mine count as text - only render when we have valid data */}
      {/* Component renders only when neighborCountStringRef has valid content to prevent showing '0' */}
      {/* Visibility controlled by conditional rendering + group.visible in useFrame */}
      {/* Stable key prevents remounting - content updates via children prop */}
      {neighborCountStringRef.current && (
        <group ref={textGroupRef}>
          <Text
            key={`text-${pillarKey}`}
            position={[0, 0, 0]}
            fontSize={radius * 0.72}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0}
            strokeWidth={0.08}
            strokeColor="#ffffff"
          >
            {neighborCountStringRef.current}
          </Text>
        </group>
      )}
      
      
      {/* Display mine symbol for revealed mines (only after flip completes and not game over) */}
      {cellState?.isRevealed && cellState.isMine && !isFlipping && gameStatus === 'playing' && (
        <mesh position={[0, getTileThickness() / 2 + 0.01, 0]}>
          <planeGeometry args={[radius * 0.6, radius * 0.6]} />
          <meshBasicMaterial color="#e74c3c" transparent opacity={0.9} />
        </mesh>
      )}
      
              {/* Display 3D flag for flagged cells (always visible, not affected by flip) */}
              {cellState?.isFlagged && (
                <Flag 
                  key={`flag-${pillarKey}`}
                  position={[0, getTileThickness() / 2 + 0.2, 0]} 
                  scale={radius * 1.5}
                  color={getCellColor()}
                />
              )}
    </group>
  )
}

// Memoize Pillar component to prevent unnecessary re-renders (performance optimization)
// Only re-render if props actually change - using shallow comparison
export const MemoizedPillar = React.memo(Pillar, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these change
  return (
    prevProps.pillarKey === nextProps.pillarKey &&
    prevProps.position[0] === nextProps.position[0] &&
    prevProps.position[1] === nextProps.position[1] &&
    prevProps.position[2] === nextProps.position[2] &&
    prevProps.height === nextProps.height &&
    prevProps.radius === nextProps.radius &&
    prevProps.allPillars === nextProps.allPillars &&
    prevProps.pillarMap === nextProps.pillarMap &&
    prevProps.sharedGeometry === nextProps.sharedGeometry
  )
})