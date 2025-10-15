import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import Scene from './Scene'
import { useStore } from './store'
import { FpsCounter } from './FpsCounter'

export default function App() {
  const reset = useStore(s => s.resetScene)
  const sunlight = useStore(s => s.sunlight)
  const setSunlight = useStore(s => s.setSunlight)
  const ambientLight = useStore(s => s.ambientLight)
  const setAmbientLight = useStore(s => s.setAmbientLight)
  const cameraRigTarget = useStore(s => s.cameraRigTarget)

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [10, 12, 14], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#2c3e50']} />
        <Scene />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>
      <FpsCounter />
      <div className="credits">Click a pillar to drop it. Camera will pan/zoom to focus.</div>
    </>
  )
}
