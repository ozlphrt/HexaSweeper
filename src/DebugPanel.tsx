import React, { useEffect, useRef } from 'react'
import * as dat from 'dat.gui'
import { useStore } from './store'
import { soundManager } from './SoundManager'

// Git commit hash injected at build time (declared in vite-env.d.ts)
const GIT_COMMIT_HASH = typeof __GIT_COMMIT_HASH__ !== 'undefined' ? __GIT_COMMIT_HASH__ : 'unknown'

// Legacy clipboard fallback function
const copyToClipboardLegacy = (text: string) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  
  try {
    document.execCommand('copy')
    alert(`Data copied to clipboard: ${text}`)
  } catch (err) {
    alert(`Failed to copy. Please copy manually: ${text}`)
  }
  
  document.body.removeChild(textArea)
}

export function DebugPanel() {
  const guiRef = useRef<dat.GUI | null>(null)
  const controlsRef = useRef<{
    rotationSlidersData?: { x: number; y: number; z: number }
    scaleData?: { scale: number }
    flagRotationSlidersData?: { x: number; y: number; z: number }
    flagOffsetSlidersData?: { x: number; y: number; z: number }
    lightingData?: { sunlight: number; ambientLight: number }
    gameSettings?: { immortalMode: boolean; gameOverSound: number; clickSound: number }
    cameraData?: { position: string; target: string; direction: string }
    cameraControls?: { position?: any; target?: any; direction?: any }
    offsetUnsubscribe?: () => void
  }>({})
  const [isVisible, setIsVisible] = React.useState(false) // Start hidden by default
  const {
    debugTextRotation,
    debugTextScale,
    debugFlagRotation,
    debugFlagOffset,
    debugCameraPosition,
    debugCameraTarget,
    debugCameraDirection,
    sunlight,
    ambientLight,
    immortalMode,
    setDebugTextRotation,
    setDebugTextScale,
    setDebugFlagRotation,
    setDebugFlagOffset,
    setSunlight,
    setAmbientLight,
    setImmortalMode
  } = useStore()

  // Handle keyboard shortcut for toggling debug panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+Alt+D
      if (event.ctrlKey && event.shiftKey && event.altKey && event.key === 'D') {
        event.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    // Only create GUI if it doesn't exist
    if (guiRef.current) {
      // Update existing controls instead of recreating
      return
    }
    
    // Detect mobile devices
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    
    // Create dat.gui instance with fixed positioning
    const gui = new dat.GUI({ 
      width: isMobile ? 280 : 300,
      autoPlace: true,
      closed: isMobile ? true : false  // Start closed on mobile
    })
    guiRef.current = gui
    
    // Ensure the panel is positioned correctly and doesn't move
    const guiElement = gui.domElement
    guiElement.style.position = 'fixed'
    guiElement.style.top = isMobile ? '10px' : '10px'
    guiElement.style.right = isMobile ? '10px' : '10px'
    guiElement.style.zIndex = '1000'
    guiElement.style.border = '1px solid #333'
    guiElement.style.borderRadius = '4px'
    guiElement.style.display = isVisible ? 'block' : 'none'
    guiElement.style.maxWidth = isMobile ? 'calc(100vw - 20px)' : '300px'
    guiElement.style.maxHeight = isMobile ? 'calc(100vh - 20px)' : 'auto'
    guiElement.style.overflowY = isMobile ? 'auto' : 'visible'

    // Add commit hash display at the top of the panel
    const versionInfo = { commit: GIT_COMMIT_HASH }
    const versionControl = gui.add(versionInfo, 'commit').name('Version (Commit)').listen()
    // Style the commit hash display
    const versionLi = versionControl.domElement.closest('li')
    if (versionLi) {
      versionLi.style.cursor = 'pointer'
      versionLi.style.userSelect = 'text'
      versionLi.title = `Git commit: ${GIT_COMMIT_HASH}\nClick to copy`
      
      // Make it clickable to copy commit hash
      versionLi.addEventListener('click', (e) => {
        e.stopPropagation() // Prevent dat.gui from collapsing folders
        const hashToCopy = GIT_COMMIT_HASH
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(hashToCopy).then(() => {
            console.log(`Commit hash copied to clipboard: ${hashToCopy}`)
            // Visual feedback
            const originalText = versionLi.querySelector('.property-name')?.textContent
            if (originalText) {
              const nameEl = versionLi.querySelector('.property-name') as HTMLElement
              const valueEl = versionLi.querySelector('.property-value') as HTMLElement
              if (nameEl && valueEl) {
                const originalValue = valueEl.textContent
                valueEl.textContent = '✓ Copied!'
                setTimeout(() => {
                  if (valueEl) valueEl.textContent = originalValue
                }, 1000)
              }
            }
          }).catch(() => {
            copyToClipboardLegacy(hashToCopy)
          })
        } else {
          copyToClipboardLegacy(hashToCopy)
        }
      })
    }

    // Camera Info (compact)
    const cameraFolder = gui.addFolder('Camera')
    controlsRef.current.cameraData = {
      position: `[${debugCameraPosition.x.toFixed(1)}, ${debugCameraPosition.y.toFixed(1)}, ${debugCameraPosition.z.toFixed(1)}]`,
      target: `[${debugCameraTarget.x.toFixed(1)}, ${debugCameraTarget.y.toFixed(1)}, ${debugCameraTarget.z.toFixed(1)}]`,
      direction: `[${debugCameraDirection.x.toFixed(2)}, ${debugCameraDirection.y.toFixed(2)}, ${debugCameraDirection.z.toFixed(2)}]`
    }
    
    // Store control references for updates
    controlsRef.current.cameraControls = {
      position: cameraFolder.add(controlsRef.current.cameraData, 'position').name('Position').listen(),
      target: cameraFolder.add(controlsRef.current.cameraData, 'target').name('Target').listen(),
      direction: cameraFolder.add(controlsRef.current.cameraData, 'direction').name('Direction').listen()
    }
    cameraFolder.open()

    // Text Controls (compact)
    const textFolder = gui.addFolder('Text')
    
    // Text Offset Controls - NEW IMPLEMENTATION
    // Read current values directly from store (no subscription)
    const currentOffset = useStore.getState().debugTextOffset
    const offsetData = {
      x: currentOffset.x,
      y: currentOffset.y,
      z: currentOffset.z,
      display: `[${currentOffset.x.toFixed(3)}, ${currentOffset.y.toFixed(3)}, ${currentOffset.z.toFixed(3)}]`
    }
    
    // Display read-only offset values
    const offsetDisplay = textFolder.add(offsetData, 'display').name('Offset').listen()
    
    // Offset sliders folder
    const offsetSliders = textFolder.addFolder('Offset Sliders')
    
    // X offset slider
    const xControl = offsetSliders.add(offsetData, 'x', -1, 1, 0.001)
      .name('X Offset')
      .onChange((value: number) => {
        // Update local data object
        offsetData.x = value
        offsetData.display = `[${offsetData.x.toFixed(3)}, ${offsetData.y.toFixed(3)}, ${offsetData.z.toFixed(3)}]`
        // Update store directly - no React state updates
        useStore.getState().setDebugTextOffset({ x: value, y: offsetData.y, z: offsetData.z })
      })
    
    // Y offset slider
    const yControl = offsetSliders.add(offsetData, 'y', -1, 1, 0.001)
      .name('Y Offset')
      .onChange((value: number) => {
        // Update local data object
        offsetData.y = value
        offsetData.display = `[${offsetData.x.toFixed(3)}, ${offsetData.y.toFixed(3)}, ${offsetData.z.toFixed(3)}]`
        // Update store directly - no React state updates
        useStore.getState().setDebugTextOffset({ x: offsetData.x, y: value, z: offsetData.z })
      })
    
    // Z offset slider
    const zControl = offsetSliders.add(offsetData, 'z', -1, 1, 0.001)
      .name('Z Offset')
      .onChange((value: number) => {
        // Update local data object
        offsetData.z = value
        offsetData.display = `[${offsetData.x.toFixed(3)}, ${offsetData.y.toFixed(3)}, ${offsetData.z.toFixed(3)}]`
        // Update store directly - no React state updates
        useStore.getState().setDebugTextOffset({ x: offsetData.x, y: offsetData.y, z: value })
      })
    
    // Update display when store changes (from outside, not from these sliders)
    // This keeps the display in sync if offset changes elsewhere
    const unsubscribeOffset = useStore.subscribe(
      (state) => state.debugTextOffset,
      (newOffset) => {
        if (offsetData.x !== newOffset.x || offsetData.y !== newOffset.y || offsetData.z !== newOffset.z) {
          offsetData.x = newOffset.x
          offsetData.y = newOffset.y
          offsetData.z = newOffset.z
          offsetData.display = `[${newOffset.x.toFixed(3)}, ${newOffset.y.toFixed(3)}, ${newOffset.z.toFixed(3)}]`
          xControl.updateDisplay()
          yControl.updateDisplay()
          zControl.updateDisplay()
          offsetDisplay.updateDisplay()
        }
      }
    )
    
    // Store unsubscribe function for cleanup
    controlsRef.current.offsetUnsubscribe = unsubscribeOffset
    
    // Combined rotation display
    const rotationData = {
      rotation: `[${debugTextRotation.x.toFixed(3)}, ${debugTextRotation.y.toFixed(3)}, ${debugTextRotation.z.toFixed(3)}]`
    }
    textFolder.add(rotationData, 'rotation').name('Rotation').listen()
    
    // Individual rotation sliders (collapsed by default)
    const rotationSliders = textFolder.addFolder('Rotation Sliders')
    controlsRef.current.rotationSlidersData = { x: debugTextRotation.x, y: debugTextRotation.y, z: debugTextRotation.z }
    rotationSliders.add(controlsRef.current.rotationSlidersData, 'x', 0, 6.28, 0.01).onChange((value: number) => {
      if (controlsRef.current.rotationSlidersData) controlsRef.current.rotationSlidersData.x = value
      setDebugTextRotation(prev => ({ ...prev, x: value }))
    })
    rotationSliders.add(controlsRef.current.rotationSlidersData, 'y', 0, 6.28, 0.01).onChange((value: number) => {
      if (controlsRef.current.rotationSlidersData) controlsRef.current.rotationSlidersData.y = value
      setDebugTextRotation(prev => ({ ...prev, y: value }))
    })
    rotationSliders.add(controlsRef.current.rotationSlidersData, 'z', 0, 6.28, 0.01).onChange((value: number) => {
      if (controlsRef.current.rotationSlidersData) controlsRef.current.rotationSlidersData.z = value
      setDebugTextRotation(prev => ({ ...prev, z: value }))
    })

    // Scale control
    controlsRef.current.scaleData = { scale: debugTextScale }
    textFolder.add(controlsRef.current.scaleData, 'scale', 0.01, 2.0, 0.01).onChange((value: number) => {
      if (controlsRef.current.scaleData) controlsRef.current.scaleData.scale = value
      setDebugTextScale(value)
    })
    
    textFolder.open()

    // Flag Controls (compact)
    const flagFolder = gui.addFolder('Flag')
    
    // Combined flag rotation display
    const flagRotationData = {
      rotation: `[${debugFlagRotation.x.toFixed(3)}, ${debugFlagRotation.y.toFixed(3)}, ${debugFlagRotation.z.toFixed(3)}]`
    }
    flagFolder.add(flagRotationData, 'rotation').name('Rotation').listen()
    
    // Individual flag rotation sliders (collapsed by default)
    const flagRotationSliders = flagFolder.addFolder('Rotation Sliders')
    controlsRef.current.flagRotationSlidersData = { x: debugFlagRotation.x, y: debugFlagRotation.y, z: debugFlagRotation.z }
    flagRotationSliders.add(controlsRef.current.flagRotationSlidersData, 'x', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagRotationSlidersData) controlsRef.current.flagRotationSlidersData.x = value
      setDebugFlagRotation(prev => ({ ...prev, x: value }))
    })
    flagRotationSliders.add(controlsRef.current.flagRotationSlidersData, 'y', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagRotationSlidersData) controlsRef.current.flagRotationSlidersData.y = value
      setDebugFlagRotation(prev => ({ ...prev, y: value }))
    })
    flagRotationSliders.add(controlsRef.current.flagRotationSlidersData, 'z', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagRotationSlidersData) controlsRef.current.flagRotationSlidersData.z = value
      setDebugFlagRotation(prev => ({ ...prev, z: value }))
    })
    
    // Combined flag offset display
    const flagOffsetData = {
      offset: `[${debugFlagOffset.x.toFixed(3)}, ${debugFlagOffset.y.toFixed(3)}, ${debugFlagOffset.z.toFixed(3)}]`
    }
    flagFolder.add(flagOffsetData, 'offset').name('Offset').listen()
    
    // Individual flag offset sliders (collapsed by default)
    const flagOffsetSliders = flagFolder.addFolder('Offset Sliders')
    controlsRef.current.flagOffsetSlidersData = { x: debugFlagOffset.x, y: debugFlagOffset.y, z: debugFlagOffset.z }
    flagOffsetSliders.add(controlsRef.current.flagOffsetSlidersData, 'x', -2, 2, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagOffsetSlidersData) controlsRef.current.flagOffsetSlidersData.x = value
      setDebugFlagOffset(prev => ({ ...prev, x: value }))
    })
    flagOffsetSliders.add(controlsRef.current.flagOffsetSlidersData, 'y', -2, 2, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagOffsetSlidersData) controlsRef.current.flagOffsetSlidersData.y = value
      setDebugFlagOffset(prev => ({ ...prev, y: value }))
    })
    flagOffsetSliders.add(controlsRef.current.flagOffsetSlidersData, 'z', -2, 2, 0.01).onChange((value: number) => {
      if (controlsRef.current.flagOffsetSlidersData) controlsRef.current.flagOffsetSlidersData.z = value
      setDebugFlagOffset(prev => ({ ...prev, z: value }))
    })
    flagFolder.open()

    // Lighting Controls (compact)
    const lightingFolder = gui.addFolder('Light')
    controlsRef.current.lightingData = { sunlight, ambientLight }
    lightingFolder.add(controlsRef.current.lightingData, 'sunlight', 0, 2, 0.01).onChange((value: number) => {
      if (controlsRef.current.lightingData) controlsRef.current.lightingData.sunlight = value
      setSunlight(value)
    })
    lightingFolder.add(controlsRef.current.lightingData, 'ambientLight', 0, 1, 0.01).onChange((value: number) => {
      if (controlsRef.current.lightingData) controlsRef.current.lightingData.ambientLight = value
      setAmbientLight(value)
    })
    lightingFolder.open()

    // Game Settings (compact)
    const gameFolder = gui.addFolder('Game')
    // Ensure we get fresh values from soundManager
    const currentGameOverSound = soundManager.getGameOverSoundStyle()
    const currentClickSound = soundManager.getClickSoundStyle()
    console.log('DebugPanel: Initializing game settings - gameOverSound:', currentGameOverSound, 'clickSound:', currentClickSound)
    controlsRef.current.gameSettings = {
      immortalMode: immortalMode,
      gameOverSound: currentGameOverSound,
      clickSound: currentClickSound
    }
    
    const immortalToggle = gameFolder.add(controlsRef.current.gameSettings, 'immortalMode')
    immortalToggle.listen()
    immortalToggle.onChange((value: boolean) => {
      if (controlsRef.current.gameSettings) controlsRef.current.gameSettings.immortalMode = value
      console.log('Immortal toggle changed to:', value)
      setImmortalMode(value)
    })
    
    // Game Over Sound selector
    const gameOverSoundNames = ['', 'Deep Explosion', 'Electric Buzz', 'Bass Drop', 'Metallic Crash', 'Quick Pop']
    const gameOverSoundControl = gameFolder.add(controlsRef.current.gameSettings, 'gameOverSound', 1, 5, 1)
      .name('Game Over Sound')
      .listen()
    gameOverSoundControl.onChange((value: number) => {
      const roundedValue = Math.round(value)
      console.log('Game Over sound slider onChange:', value, 'rounded to:', roundedValue)
      if (controlsRef.current.gameSettings) controlsRef.current.gameSettings.gameOverSound = roundedValue
      // Set the style immediately (synchronous)
      soundManager.setGameOverSoundStyle(roundedValue)
      // Verify it was set
      const verifyStyle = soundManager.getGameOverSoundStyle()
      console.log('Game Over sound changed to:', roundedValue, gameOverSoundNames[roundedValue], 'verified:', verifyStyle)
      // Play preview - playGameOver already handles AudioContext resume
      requestAnimationFrame(() => {
        console.log('Playing game over preview with style:', soundManager.getGameOverSoundStyle())
        soundManager.playGameOver()
      })
    })
    
    // Click Sound selector  
    const clickSoundNames = ['', 'Gentle Tap', 'Deep Thud', 'Glass Tinkle', 'Metallic Tick', 'Soft Chime']
    const clickSoundControl = gameFolder.add(controlsRef.current.gameSettings, 'clickSound', 1, 5, 1)
      .name('Click Sound')
      .listen()
    clickSoundControl.onChange((value: number) => {
      const roundedValue = Math.round(value)
      if (controlsRef.current.gameSettings) controlsRef.current.gameSettings.clickSound = roundedValue
      console.log('Click sound changed to:', roundedValue, clickSoundNames[roundedValue])
      // Set the style immediately (synchronous)
      soundManager.setClickSoundStyle(roundedValue)
      // Verify it was set
      const verifyStyle = soundManager.getClickSoundStyle()
      console.log('Verified click sound style:', verifyStyle, 'should be', roundedValue)
      // Play preview - playClick already handles AudioContext resume
      requestAnimationFrame(() => {
        soundManager.playClick()
      })
    })
    
    // Copy to Clipboard button
    const copyToClipboard = () => {
      const debugData = {
        text: {
          offset: {
            x: useStore.getState().debugTextOffset.x.toFixed(3),
            y: useStore.getState().debugTextOffset.y.toFixed(3),
            z: useStore.getState().debugTextOffset.z.toFixed(3)
          },
          rotation: {
            x: debugTextRotation.x.toFixed(3),
            y: debugTextRotation.y.toFixed(3),
            z: debugTextRotation.z.toFixed(3)
          },
          scale: debugTextScale.toFixed(3)
        },
        flag: {
          offset: {
            x: debugFlagOffset.x.toFixed(3),
            y: debugFlagOffset.y.toFixed(3),
            z: debugFlagOffset.z.toFixed(3)
          },
          rotation: {
            x: debugFlagRotation.x.toFixed(3),
            y: debugFlagRotation.y.toFixed(3),
            z: debugFlagRotation.z.toFixed(3)
          }
        },
        camera: {
          position: {
            x: debugCameraPosition.x.toFixed(2),
            y: debugCameraPosition.y.toFixed(2),
            z: debugCameraPosition.z.toFixed(2)
          },
          target: {
            x: debugCameraTarget.x.toFixed(2),
            y: debugCameraTarget.y.toFixed(2),
            z: debugCameraTarget.z.toFixed(2)
          },
          direction: {
            x: debugCameraDirection.x.toFixed(3),
            y: debugCameraDirection.y.toFixed(3),
            z: debugCameraDirection.z.toFixed(3)
          }
        },
        lighting: {
          sunlight: sunlight.toFixed(2),
          ambientLight: ambientLight.toFixed(2)
        },
        game: {
          immortalMode: immortalMode,
          clickSound: `${controlsRef.current.gameSettings?.clickSound || soundManager.getClickSoundStyle()} (${clickSoundNames[controlsRef.current.gameSettings?.clickSound || soundManager.getClickSoundStyle()]})`,
          gameOverSound: `${controlsRef.current.gameSettings?.gameOverSound || soundManager.getGameOverSoundStyle()} (${gameOverSoundNames[controlsRef.current.gameSettings?.gameOverSound || soundManager.getGameOverSoundStyle()]})`
        }
      }

      const formattedText = `# Debug Configuration

## Text Settings
- Offset: [${debugData.text.offset.x}, ${debugData.text.offset.y}, ${debugData.text.offset.z}]
- Rotation: [${debugData.text.rotation.x}, ${debugData.text.rotation.y}, ${debugData.text.rotation.z}]
- Scale: ${debugData.text.scale}

## Flag Settings
- Offset: [${debugData.flag.offset.x}, ${debugData.flag.offset.y}, ${debugData.flag.offset.z}]
- Rotation: [${debugData.flag.rotation.x}, ${debugData.flag.rotation.y}, ${debugData.flag.rotation.z}]

## Camera Settings
- Position: [${debugData.camera.position.x}, ${debugData.camera.position.y}, ${debugData.camera.position.z}]
- Target: [${debugData.camera.target.x}, ${debugData.camera.target.y}, ${debugData.camera.target.z}]
- Direction: [${debugData.camera.direction.x}, ${debugData.camera.direction.y}, ${debugData.camera.direction.z}]

## Lighting Settings
- Sunlight: ${debugData.lighting.sunlight}
- Ambient Light: ${debugData.lighting.ambientLight}

## Game Settings
- Immortal Mode: ${debugData.game.immortalMode}
- Click Sound: ${debugData.game.clickSound}
- Game Over Sound: ${debugData.game.gameOverSound}

## JSON Format (for code use)
\`\`\`json
${JSON.stringify(debugData, null, 2)}
\`\`\`
`

      copyToClipboardLegacy(formattedText)
    }
    
    gameFolder.add({ copyConfig: copyToClipboard }, 'copyConfig').name('📋 Copy Config to Clipboard')
    
    gameFolder.open()


    // Log debug panel access
    console.log('Debug Panel: Press Ctrl+Shift+Alt+D to toggle. Sound controls in Game folder.')
  }, [debugTextRotation, debugTextScale, debugFlagRotation, debugFlagOffset, sunlight, ambientLight, immortalMode, isVisible, setDebugTextRotation, setDebugTextScale, setDebugFlagRotation, setDebugFlagOffset, setSunlight, setAmbientLight, setImmortalMode])

  // Update camera data when values change - dat.gui's listen() will automatically update the display
  useEffect(() => {
    if (!controlsRef.current.cameraData) return
    
    controlsRef.current.cameraData.position = `[${debugCameraPosition.x.toFixed(1)}, ${debugCameraPosition.y.toFixed(1)}, ${debugCameraPosition.z.toFixed(1)}]`
    controlsRef.current.cameraData.target = `[${debugCameraTarget.x.toFixed(1)}, ${debugCameraTarget.y.toFixed(1)}, ${debugCameraTarget.z.toFixed(1)}]`
    controlsRef.current.cameraData.direction = `[${debugCameraDirection.x.toFixed(2)}, ${debugCameraDirection.y.toFixed(2)}, ${debugCameraDirection.z.toFixed(2)}]`
  }, [debugCameraPosition, debugCameraTarget, debugCameraDirection])

  // Handle visibility changes
  useEffect(() => {
    if (guiRef.current) {
      const guiElement = guiRef.current.domElement
      guiElement.style.display = isVisible ? 'block' : 'none'
    }
  }, [isVisible])
  
  // Cleanup function - unsubscribe from offset changes and destroy GUI
  useEffect(() => {
    return () => {
      // Unsubscribe from offset changes if subscribed
      if (controlsRef.current.offsetUnsubscribe) {
        controlsRef.current.offsetUnsubscribe()
        controlsRef.current.offsetUnsubscribe = undefined
      }
      // Destroy GUI if it exists
      if (guiRef.current) {
        guiRef.current.destroy()
        guiRef.current = null
      }
    }
  }, [])

  return null // dat.gui renders to document.body
}
