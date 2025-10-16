import { create } from 'zustand'

export interface PillarConfig {
  key: string
  pos: [number, number, number]
  height: number
}

export interface CellState {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMineCount: number
}

export interface GameState {
  pillarConfigs: PillarConfig[]
  cellStates: Record<string, CellState>
  gameStatus: 'playing' | 'won' | 'lost'
  mineCount: number
  flagCount: number
  cameraRigTarget: [number, number, number] | null
  sunlight: number
  ambientLight: number
  debugTextRotation: { x: number; y: number; z: number }
  debugTextOffset: { x: number; y: number; z: number }
  debugFlagRotation: { x: number; y: number; z: number }
  debugFlagOffset: { x: number; y: number; z: number }
  debugCameraPosition: { x: number; y: number; z: number }
  revealQueue: string[]
  isRevealing: boolean
}

export const useStore = create<GameState>((set, get) => ({
  pillarConfigs: [],
  cellStates: {},
  gameStatus: 'playing',
  mineCount: 0,
  flagCount: 0,
  cameraRigTarget: null,
  sunlight: 1.0,
  ambientLight: 0.3,
  debugTextRotation: { x: 4.69, y: 0, z: 0 },
  debugTextOffset: { x: -0.21, y: 0.06, z: 0.21 },
  debugFlagRotation: { x: 0, y: 2.6, z: 0 },
  debugFlagOffset: { x: 0.32, y: 1.00, z: 0.21 },
  debugCameraPosition: { x: 1.76, y: 8.78, z: 23.95 },
  revealQueue: [],
  isRevealing: false,

  resetScene: () => set({
    pillarConfigs: [],
    cellStates: {},
    gameStatus: 'playing',
    mineCount: 0,
    flagCount: 0,
  cameraRigTarget: null,
    sunlight: 1.0,
    ambientLight: 0.3,
    debugTextRotation: { x: 4.69, y: 0, z: 0 },
  debugTextOffset: { x: -0.21, y: 0.06, z: 0.21 },
  revealQueue: [],
  isRevealing: false,
  }),

  setPillarHeight: (key: string, height: number) => set((state) => ({
    pillarConfigs: state.pillarConfigs.map(p => 
      p.key === key ? { ...p, height } : p
    )
  })),

  initializeGame: (pillarConfigs: PillarConfig[], mineCount: number) => {
    const cellStates: Record<string, CellState> = {}
    
    // Debug: Log the pillar configs to see what we're working with
    console.log('Initializing game with', pillarConfigs.length, 'cells')
    console.log('First few cells:', pillarConfigs.slice(0, 5))
    
    // Initialize all cells
    pillarConfigs.forEach(pillar => {
      cellStates[pillar.key] = {
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMineCount: 0
      }
    })

    // Place mines randomly
    const minePositions = new Set<string>()
    const totalCells = pillarConfigs.length
    const actualMineCount = Math.min(mineCount, totalCells)
    
    console.log('Placing', actualMineCount, 'mines in', totalCells, 'cells')
    
    while (minePositions.size < actualMineCount) {
      const randomIndex = Math.floor(Math.random() * totalCells)
      minePositions.add(pillarConfigs[randomIndex].key)
    }

    console.log('Mine positions:', Array.from(minePositions).slice(0, 10))

    // Set mines and calculate neighbor counts
    minePositions.forEach(key => {
      cellStates[key].isMine = true
    })

    // Calculate neighbor mine counts
    pillarConfigs.forEach(pillar => {
      const neighbors = getNeighbors(pillar.key, pillarConfigs)
      const neighborMineCount = neighbors.filter(neighborKey => 
        cellStates[neighborKey]?.isMine
      ).length
      cellStates[pillar.key].neighborMineCount = neighborMineCount
    })

    set({
      pillarConfigs,
      cellStates,
      mineCount: actualMineCount,
      flagCount: 0,
      gameStatus: 'playing'
    })
  },

  revealCell: (key: string) => {
    const state = get()
    if (state.gameStatus !== 'playing') return

    const cell = state.cellStates[key]
    if (!cell || cell.isRevealed || cell.isFlagged) return

    // Reveal the cell
    set((state) => ({
      cellStates: {
        ...state.cellStates,
        [key]: { ...cell, isRevealed: true }
      }
    }))

    // Check if it's a mine
    if (cell.isMine) {
      set({ gameStatus: 'lost' })
      return
    }

    // If no neighboring mines, reveal neighbors
    if (cell.neighborMineCount === 0) {
      const neighbors = getNeighbors(key, state.pillarConfigs)
      neighbors.forEach(neighborKey => {
        get().revealCell(neighborKey)
      })
    }

    // Check win condition
    const revealedCount = Object.values(get().cellStates).filter(c => c.isRevealed).length
    const totalCells = state.pillarConfigs.length
    if (revealedCount === totalCells - state.mineCount) {
      set({ gameStatus: 'won' })
    }
  },

  toggleFlag: (key: string) => {
    const state = get()
    if (state.gameStatus !== 'playing') return

    const cell = state.cellStates[key]
    if (!cell || cell.isRevealed) return

    const newFlagged = !cell.isFlagged
    const flagDelta = newFlagged ? 1 : -1

    set((state) => ({
      cellStates: {
        ...state.cellStates,
        [key]: { ...cell, isFlagged: newFlagged }
      },
      flagCount: state.flagCount + flagDelta
    }))
  },

  setCameraTarget: (target: [number, number, number] | null) => set({ cameraRigTarget: target }),

  setSunlight: (intensity: number) => set({ sunlight: intensity }),

  setAmbientLight: (intensity: number) => set({ ambientLight: intensity }),

  setDebugTextRotation: (rotation: { x: number; y: number; z: number }) => set({ debugTextRotation: rotation }),

  setDebugTextOffset: (offset: { x: number; y: number; z: number }) => set({ debugTextOffset: offset }),

  setDebugFlagRotation: (rotation: { x: number; y: number; z: number }) => set({ debugFlagRotation: rotation }),

  setDebugFlagOffset: (offset: { x: number; y: number; z: number }) => set({ debugFlagOffset: offset }),

  setDebugCameraPosition: (position: { x: number; y: number; z: number }) => set({ debugCameraPosition: position }),

  addToRevealQueue: (key: string) => set((state) => ({
    revealQueue: [...state.revealQueue, key],
    isRevealing: true
  })),

  processRevealQueue: () => {
    const { revealQueue, cellStates, gameStatus, mineCount, pillarConfigs } = get()
    if (revealQueue.length === 0) {
      set({ isRevealing: false })
      return
    }

    const key = revealQueue[0]
    const newQueue = revealQueue.slice(1)
    
    if (gameStatus !== 'playing' || !cellStates[key] || cellStates[key].isRevealed || cellStates[key].isFlagged) {
      set({ revealQueue: newQueue })
      return
    }

    const newCellStates = { ...cellStates }
    const cell = newCellStates[key]

    if (cell.isMine) {
      // Game over - reveal all mines
      Object.values(newCellStates).forEach(c => {
        if (c.isMine) c.isRevealed = true
      })
      set({ cellStates: newCellStates, gameStatus: 'lost', revealQueue: [], isRevealing: false })
      return
    }

    // Reveal this cell
    cell.isRevealed = true
    cell.isFlagged = false

    // If this cell has no neighboring mines, add neighbors to queue
    if (cell.neighborMineCount === 0 && !cell.isMine) {
      const neighbors = getNeighbors(key, pillarConfigs)
      const newNeighbors = neighbors.filter(nKey => 
        newCellStates[nKey] && 
        !newCellStates[nKey].isRevealed && 
        !newCellStates[nKey].isFlagged &&
        !newQueue.includes(nKey)
      )
      newQueue.push(...newNeighbors)
    }

    // Check for win condition
    const unrevealedSafeCells = Object.values(newCellStates).filter(c => !c.isMine && !c.isRevealed).length
    if (unrevealedSafeCells === 0) {
      set({ cellStates: newCellStates, gameStatus: 'won', revealQueue: [], isRevealing: false })
    } else {
      set({ cellStates: newCellStates, revealQueue: newQueue })
    }
  },

  resetGame: () => {
    // First, reset all game state to initial values
    set({
      pillarConfigs: [],
      cellStates: {},
      gameStatus: 'playing',
      mineCount: 0,
      flagCount: 0,
      revealQueue: [],
      isRevealing: false
    })

    // Generate a completely new board with new gaps and mine positions
    const radius = 0.8
    const spacingScale = 0.85
    const rows = 50
    const cols = 50
    const maxDistance = 18

    // Hexagonal positioning function
    const hexPosition = (q: number, r: number) => {
      const size = radius * spacingScale
      const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
      const z = size * (3 / 2 * r)
      return [x, 0, z] as const
    }

    // Generate new grid configuration
    const newPillars: { key: string, pos: [number, number, number], height: number }[] = []
    const r0 = -Math.floor(rows / 2)
    const c0 = -Math.floor(cols / 2)

    // Create new 50x50 hexagonal grid with circular boundary
    for (let q = 0; q < cols; q++) {
      for (let r = 0; r < rows; r++) {
        const [x, y, z] = hexPosition(q + c0, r + r0)

        // Check if tile is within circular boundary
        const distanceFromCenter = Math.sqrt(x * x + z * z)
        if (distanceFromCenter > maxDistance) {
          continue
        }

        // 15% chance of creating a gap (no tile)
        if (Math.random() < 0.15) {
          continue
        }

        // Create empty pillars (height 0) for Minesweeper
        newPillars.push({ key: `p-${q}-${r}`, pos: [x, y, z], height: 0 })
      }
    }

    if (newPillars.length > 0) {
      const newMineCount = Math.floor(newPillars.length * 0.15) // 15% of actual cells are mines
      get().initializeGame(newPillars, newMineCount)
    }
  },
}))

// Helper function to get neighboring cells in hexagonal grid
function getNeighbors(key: string, pillarConfigs: PillarConfig[]): string[] {
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
    if (pillarConfigs.some(p => p.key === neighborKey)) {
      neighbors.push(neighborKey)
    }
  })
  
  return neighbors
}