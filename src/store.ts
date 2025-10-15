import { create } from 'zustand'

type State = {
  sunlight: number
  setSunlight: (v: number) => void

  ambientLight: number
  setAmbientLight: (v: number) => void

  cameraRigTarget: [number, number, number] | null
  setCameraRigTarget: (p: [number, number, number] | null) => void

  pillarConfigs: Map<string, number> // pillarId -> coin count
  setPillarHeight: (pillarId: string, height: number) => void
  getPillarHeight: (pillarId: string) => number
  coinDirections: Map<string, [number, number, number][]> // pillarId -> array of directions for each coin
  setCoinDirection: (pillarId: string, coinIndex: number, direction: [number, number, number]) => void
  getCoinDirection: (pillarId: string, coinIndex: number) => [number, number, number]
  blockedAnimations: Set<string> // Track which coins are in blocked animation state
  setBlockedAnimation: (pillarId: string, coinIndex: number, isBlocked: boolean) => void
  isBlockedAnimation: (pillarId: string, coinIndex: number) => boolean

  // Scoring System
  score: number
  setScore: (score: number) => void
  addScore: (points: number) => void
  moveHistory: Array<{
    type: 'void_drop' | 'valid_move' | 'blocked_move' | 'chain_reaction'
    points: number
    description: string
    timestamp: number
  }>
  addMoveToHistory: (move: Omit<State['moveHistory'][0], 'timestamp'>) => void
  getScoreBreakdown: () => {
    voidDrops: number
    validMoves: number
    blockedMoves: number
    chainReactions: number
    totalMoves: number
  }

  // Confetti System
  confettiEvents: Array<{
    id: string
    position: [number, number, number]
    isActive: boolean
    timestamp: number
  }>
  triggerConfetti: (position: [number, number, number]) => void
  removeConfetti: (id: string) => void


  resetScene: () => void
}

export const useStore = create<State>((set, get) => ({
  sunlight: 1.0,
  setSunlight: (v) => set({ sunlight: v }),
  
  ambientLight: 0.0,
  setAmbientLight: (v) => set({ ambientLight: v }),
  
  cameraRigTarget: null,
  setCameraRigTarget: (p) => set({ cameraRigTarget: p }),

  pillarConfigs: new Map(),
  setPillarHeight: (pillarId, height) => set((state) => {
    const newConfigs = new Map(state.pillarConfigs)
    newConfigs.set(pillarId, height)
    return { pillarConfigs: newConfigs }
  }),
  getPillarHeight: (pillarId) => get().pillarConfigs.get(pillarId) || 0,
  coinDirections: new Map(),
  setCoinDirection: (pillarId, coinIndex, direction) => set((state) => {
    const newDirections = new Map(state.coinDirections)
    if (!newDirections.has(pillarId)) {
      newDirections.set(pillarId, [])
    }
    const directions = [...(newDirections.get(pillarId) || [])]
    directions[coinIndex] = direction
    newDirections.set(pillarId, directions)
    return { coinDirections: newDirections }
  }),
  getCoinDirection: (pillarId, coinIndex) => {
    const directions = get().coinDirections.get(pillarId) || []
    return directions[coinIndex] || [0, 0, 0]
  },
  blockedAnimations: new Set(),
  setBlockedAnimation: (pillarId, coinIndex, isBlocked) => set((state) => {
    const newBlocked = new Set(state.blockedAnimations)
    const key = `${pillarId}-${coinIndex}`
    if (isBlocked) {
      newBlocked.add(key)
    } else {
      newBlocked.delete(key)
    }
    return { blockedAnimations: newBlocked }
  }),
  isBlockedAnimation: (pillarId, coinIndex) => {
    const key = `${pillarId}-${coinIndex}`
    return get().blockedAnimations.has(key)
  },

  // Scoring System
  score: 0,
  setScore: (score) => set({ score }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  moveHistory: [],
  addMoveToHistory: (move) => set((state) => ({
    moveHistory: [...state.moveHistory, { ...move, timestamp: Date.now() }]
  })),
  getScoreBreakdown: () => {
    const history = get().moveHistory
    return {
      voidDrops: history.filter(m => m.type === 'void_drop').length,
      validMoves: history.filter(m => m.type === 'valid_move').length,
      blockedMoves: history.filter(m => m.type === 'blocked_move').length,
      chainReactions: history.filter(m => m.type === 'chain_reaction').length,
      totalMoves: history.length
    }
  },

  // Confetti System
  confettiEvents: [],
  triggerConfetti: (position) => set((state) => {
    const id = `confetti-${Date.now()}-${Math.random()}`
    return {
      confettiEvents: [...state.confettiEvents, {
        id,
        position,
        isActive: true,
        timestamp: Date.now()
      }]
    }
  }),
  removeConfetti: (id) => set((state) => ({
    confettiEvents: state.confettiEvents.filter(event => event.id !== id)
  })),

  resetScene: () => {
    // Soft reset: just clear camera focus; user can refresh to fully reset bodies
    set({ 
      cameraRigTarget: null, 
      sunlight: 1.0, 
      ambientLight: 0.0, 
      pillarConfigs: new Map(), 
      coinDirections: new Map(), 
      blockedAnimations: new Set(),
      score: 0,
      moveHistory: [],
      confettiEvents: []
    })
  },
}))
