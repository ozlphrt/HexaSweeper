import { create } from 'zustand'

type State = {
  sunlight: number
  setSunlight: (v: number) => void

  ambientLight: number
  setAmbientLight: (v: number) => void

  cameraRigTarget: [number, number, number] | null
  setCameraRigTarget: (p: [number, number, number] | null) => void

  resetScene: () => void
}

export const useStore = create<State>((set, get) => ({
  sunlight: 1.0,
  setSunlight: (v) => set({ sunlight: v }),
  
  ambientLight: 0.0,
  setAmbientLight: (v) => set({ ambientLight: v }),
  
  cameraRigTarget: null,
  setCameraRigTarget: (p) => set({ cameraRigTarget: p }),

  resetScene: () => {
    // Soft reset: just clear camera focus; user can refresh to fully reset bodies
    set({ cameraRigTarget: null, sunlight: 1.0, ambientLight: 0.0 })
  },
}))
