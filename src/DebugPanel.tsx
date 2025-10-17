import React, { useEffect, useRef } from 'react'
import * as dat from 'dat.gui'
import { useStore } from './store'

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
  const [isVisible, setIsVisible] = React.useState(false)
  const {
    debugTextOffset,
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
    setDebugTextOffset,
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
      return
    }
    
    // Create dat.gui instance with fixed positioning
    const gui = new dat.GUI({ 
      width: 280,
      autoPlace: true,
      closed: false
    })
    guiRef.current = gui
    
    // Ensure the panel is positioned correctly and doesn't move
    const guiElement = gui.domElement
    guiElement.style.position = 'fixed'
    guiElement.style.top = '10px'
    guiElement.style.right = '10px'
    guiElement.style.zIndex = '1000'
    guiElement.style.border = '1px solid #333'
    guiElement.style.borderRadius = '4px'
    guiElement.style.display = isVisible ? 'block' : 'none'

    // Camera Info (compact)
    const cameraFolder = gui.addFolder('Camera')
    const cameraData = {
      position: `[${debugCameraPosition.x.toFixed(1)}, ${debugCameraPosition.y.toFixed(1)}, ${debugCameraPosition.z.toFixed(1)}]`,
      target: `[${debugCameraTarget.x.toFixed(1)}, ${debugCameraTarget.y.toFixed(1)}, ${debugCameraTarget.z.toFixed(1)}]`,
      direction: `[${debugCameraDirection.x.toFixed(2)}, ${debugCameraDirection.y.toFixed(2)}, ${debugCameraDirection.z.toFixed(2)}]`
    }
    
    cameraFolder.add(cameraData, 'position').name('Position').listen()
    cameraFolder.add(cameraData, 'target').name('Target').listen()
    cameraFolder.add(cameraData, 'direction').name('Direction').listen()
    cameraFolder.open()

    // Text Controls (compact)
    const textFolder = gui.addFolder('Text')
    
    // Combined offset display
    const offsetData = {
      offset: `[${debugTextOffset.x.toFixed(3)}, ${debugTextOffset.y.toFixed(3)}, ${debugTextOffset.z.toFixed(3)}]`
    }
    textFolder.add(offsetData, 'offset').name('Offset').listen()
    
    // Individual offset sliders (collapsed by default)
    const offsetSliders = textFolder.addFolder('Offset Sliders')
    offsetSliders.add({ x: debugTextOffset.x }, 'x', -1, 1, 0.001).onChange((value: number) => {
      setDebugTextOffset({ ...debugTextOffset, x: value })
    })
    offsetSliders.add({ y: debugTextOffset.y }, 'y', -1, 1, 0.001).onChange((value: number) => {
      setDebugTextOffset({ ...debugTextOffset, y: value })
    })
    offsetSliders.add({ z: debugTextOffset.z }, 'z', -1, 1, 0.001).onChange((value: number) => {
      setDebugTextOffset({ ...debugTextOffset, z: value })
    })
    
    // Combined rotation display
    const rotationData = {
      rotation: `[${debugTextRotation.x.toFixed(3)}, ${debugTextRotation.y.toFixed(3)}, ${debugTextRotation.z.toFixed(3)}]`
    }
    textFolder.add(rotationData, 'rotation').name('Rotation').listen()
    
    // Individual rotation sliders (collapsed by default)
    const rotationSliders = textFolder.addFolder('Rotation Sliders')
    rotationSliders.add({ x: debugTextRotation.x }, 'x', 0, 6.28, 0.01).onChange((value: number) => {
      setDebugTextRotation({ ...debugTextRotation, x: value })
    })
    rotationSliders.add({ y: debugTextRotation.y }, 'y', 0, 6.28, 0.01).onChange((value: number) => {
      setDebugTextRotation({ ...debugTextRotation, y: value })
    })
    rotationSliders.add({ z: debugTextRotation.z }, 'z', 0, 6.28, 0.01).onChange((value: number) => {
      setDebugTextRotation({ ...debugTextRotation, z: value })
    })

    // Scale control
    textFolder.add({ scale: debugTextScale }, 'scale', 0.01, 2.0, 0.01).onChange((value: number) => {
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
    flagRotationSliders.add({ x: debugFlagRotation.x }, 'x', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      setDebugFlagRotation({ ...debugFlagRotation, x: value })
    })
    flagRotationSliders.add({ y: debugFlagRotation.y }, 'y', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      setDebugFlagRotation({ ...debugFlagRotation, y: value })
    })
    flagRotationSliders.add({ z: debugFlagRotation.z }, 'z', -Math.PI, Math.PI, 0.01).onChange((value: number) => {
      setDebugFlagRotation({ ...debugFlagRotation, z: value })
    })
    
    // Combined flag offset display
    const flagOffsetData = {
      offset: `[${debugFlagOffset.x.toFixed(3)}, ${debugFlagOffset.y.toFixed(3)}, ${debugFlagOffset.z.toFixed(3)}]`
    }
    flagFolder.add(flagOffsetData, 'offset').name('Offset').listen()
    
    // Individual flag offset sliders (collapsed by default)
    const flagOffsetSliders = flagFolder.addFolder('Offset Sliders')
    flagOffsetSliders.add({ x: debugFlagOffset.x }, 'x', -2, 2, 0.01).onChange((value: number) => {
      setDebugFlagOffset({ ...debugFlagOffset, x: value })
    })
    flagOffsetSliders.add({ y: debugFlagOffset.y }, 'y', -2, 2, 0.01).onChange((value: number) => {
      setDebugFlagOffset({ ...debugFlagOffset, y: value })
    })
    flagOffsetSliders.add({ z: debugFlagOffset.z }, 'z', -2, 2, 0.01).onChange((value: number) => {
      setDebugFlagOffset({ ...debugFlagOffset, z: value })
    })
    flagFolder.open()

    // Lighting Controls (compact)
    const lightingFolder = gui.addFolder('Light')
    lightingFolder.add({ sunlight }, 'sunlight', 0, 2, 0.01).onChange((value: number) => {
      setSunlight(value)
    })
    lightingFolder.add({ ambientLight }, 'ambientLight', 0, 1, 0.01).onChange((value: number) => {
      setAmbientLight(value)
    })
    lightingFolder.open()

    // Game Settings (compact)
    const gameFolder = gui.addFolder('Game')
    const gameSettings = {
      immortalMode: immortalMode
    }
    const immortalToggle = gameFolder.add(gameSettings, 'immortalMode')
    immortalToggle.listen()
    immortalToggle.onChange((value: boolean) => {
      console.log('Immortal toggle changed to:', value)
      setImmortalMode(value)
    })
    gameFolder.open()


    // Update camera data in real-time
    const updateCameraData = () => {
      cameraData.position = `[${debugCameraPosition.x.toFixed(1)}, ${debugCameraPosition.y.toFixed(1)}, ${debugCameraPosition.z.toFixed(1)}]`
      cameraData.target = `[${debugCameraTarget.x.toFixed(1)}, ${debugCameraTarget.y.toFixed(1)}, ${debugCameraTarget.z.toFixed(1)}]`
      cameraData.direction = `[${debugCameraDirection.x.toFixed(2)}, ${debugCameraDirection.y.toFixed(2)}, ${debugCameraDirection.z.toFixed(2)}]`
    }

    const interval = setInterval(updateCameraData, 500) // Reduced from 100ms to 500ms

    return () => {
      clearInterval(interval)
      // Don't destroy the GUI on cleanup to prevent jittery recreation
      // gui.destroy()
    }
  }, [debugTextOffset, debugTextRotation, debugTextScale, debugFlagRotation, debugFlagOffset, debugCameraPosition, debugCameraTarget, debugCameraDirection, sunlight, ambientLight, immortalMode, setDebugTextOffset, setDebugTextRotation, setDebugTextScale, setDebugFlagRotation, setDebugFlagOffset, setSunlight, setAmbientLight, setImmortalMode])

  // Handle visibility changes
  useEffect(() => {
    if (guiRef.current) {
      const guiElement = guiRef.current.domElement
      guiElement.style.display = isVisible ? 'block' : 'none'
    }
  }, [isVisible])

  return null // dat.gui renders to document.body
}
