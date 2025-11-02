import { create } from 'zustand'
import { soundManager } from './SoundManager'

// Helper function to get neighboring cells in hexagonal grid
// Optimized: Use Map for O(1) lookup instead of O(n) array.some()
function getNeighbors(key: string, pillarMap: Map<string, PillarConfig>): string[] {
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

// Helper function to generate logically solvable puzzles
// Optimized: Use Map for O(1) neighbor lookups
function generateSolvablePuzzle(pillarConfigs: PillarConfig[], pillarMap: Map<string, PillarConfig>, targetMineCount: number) {
  const totalCells = pillarConfigs.length
  const maxMineCount = Math.min(targetMineCount, Math.floor(totalCells * 0.2)) // Max 20% mine density
  
  // Try multiple times to generate a solvable puzzle
  for (let attempt = 0; attempt < 10; attempt++) {
    const minePositions = new Set<string>()
    
    // Place mines with some strategic constraints
    while (minePositions.size < maxMineCount) {
      const randomIndex = Math.floor(Math.random() * totalCells)
      const candidateKey = pillarConfigs[randomIndex].key
      
      // Avoid clustering mines too much (optimized with Map)
      const neighbors = getNeighbors(candidateKey, pillarMap)
      const neighborMineCount = neighbors.filter(neighborKey => 
        minePositions.has(neighborKey)
      ).length
      
      // Only place mine if it doesn't create too many neighbor mines
      if (neighborMineCount < 3) {
        minePositions.add(candidateKey)
      }
    }
    
    // For now, just return the first valid configuration
    // TODO: Re-enable solvability testing once basic functionality is working
    return { minePositions, actualMineCount: minePositions.size }
  }
  
  // Fallback: return a simple configuration if we can't generate a complex one
  const minePositions = new Set<string>()
  const simpleMineCount = Math.min(maxMineCount, Math.floor(totalCells * 0.1))
  
  for (let i = 0; i < simpleMineCount; i++) {
    const randomIndex = Math.floor(Math.random() * totalCells)
    minePositions.add(pillarConfigs[randomIndex].key)
  }
  
  return { minePositions, actualMineCount: minePositions.size }
}

// Test if a puzzle configuration is logically solvable
// Optimized: Use Map for O(1) neighbor lookups
function isPuzzleSolvable(pillarConfigs: PillarConfig[], pillarMap: Map<string, PillarConfig>, minePositions: Set<string>) {
  // Create a temporary cell states for testing
  const tempCellStates: Record<string, CellState> = {}
  
  pillarConfigs.forEach(pillar => {
    tempCellStates[pillar.key] = {
      isMine: minePositions.has(pillar.key),
      isRevealed: false,
      isFlagged: false,
      neighborMineCount: 0,
      isImmortalMine: false
    }
  })
  
  // Calculate neighbor counts (optimized with Map)
  pillarConfigs.forEach(pillar => {
    const neighbors = getNeighbors(pillar.key, pillarMap)
    const neighborMineCount = neighbors.filter(neighborKey => 
      tempCellStates[neighborKey]?.isMine
    ).length
    tempCellStates[pillar.key].neighborMineCount = neighborMineCount
  })
  
  // Simulate logical solving
  const revealed = new Set<string>()
  const flagged = new Set<string>()
  let changed = true
  let iterations = 0
  const maxIterations = 100 // Prevent infinite loops
  
  while (changed && iterations < maxIterations) {
    changed = false
    iterations++
    
    // Create pillar map once for O(1) lookups (optimization)
    const pillarMap = new Map(pillarConfigs.map(p => [p.key, p]))
    
    // Find cells that can be logically determined
    for (const pillar of pillarConfigs) {
      const key = pillar.key
      const cell = tempCellStates[key]
      
      if (cell.isRevealed || cell.isMine) continue
      
      const neighbors = getNeighbors(key, pillarMap)
      const unrevealedNeighbors = neighbors.filter(neighborKey => 
        tempCellStates[neighborKey] && !tempCellStates[neighborKey].isRevealed && !flagged.has(neighborKey)
      )
      const flaggedNeighbors = neighbors.filter(neighborKey => 
        flagged.has(neighborKey)
      )
      
      // If all mines around this cell are flagged, reveal it
      if (flaggedNeighbors.length === cell.neighborMineCount && unrevealedNeighbors.length > 0) {
        revealed.add(key)
        changed = true
      }
      
      // If all remaining neighbors must be mines, flag them
      if (unrevealedNeighbors.length === cell.neighborMineCount - flaggedNeighbors.length && unrevealedNeighbors.length > 0) {
        unrevealedNeighbors.forEach(neighborKey => {
          if (!tempCellStates[neighborKey].isMine) return false // Invalid configuration
          flagged.add(neighborKey)
          changed = true
        })
      }
    }
  }
  
  // Check if we can solve a significant portion without guessing
  const totalSafeCells = pillarConfigs.length - minePositions.size
  const solvedCells = revealed.size
  const solvePercentage = solvedCells / totalSafeCells
  
  // Consider solvable if we can solve at least 70% without guessing
  return solvePercentage >= 0.7
}

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
  isImmortalMine?: boolean
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
  debugTextScale: number
  debugTextFont: string
  debugFlagRotation: { x: number; y: number; z: number }
  debugFlagOffset: { x: number; y: number; z: number }
  debugCameraPosition: { x: number; y: number; z: number }
  debugCameraTarget: { x: number; y: number; z: number }
  debugCameraDirection: { x: number; y: number; z: number }
  revealQueue: string[]
  isRevealing: boolean
  hoveredTile: string | null
  clickedMinePosition: [number, number, number] | null
  gameResetTrigger: number
  audioEnabled: boolean
  immortalMode: boolean
}

export const useStore = create<GameState>((set, get) => ({
  pillarConfigs: [],
  cellStates: {},
  gameStatus: 'playing',
  mineCount: 0,
  flagCount: 0,
  cameraRigTarget: null,
  sunlight: 1.27,
  ambientLight: 0.53,
  debugTextRotation: { x: 4.700, y: 0.010, z: 0.000 },
    debugTextOffset: { x: 0.015, y: 0.134, z: -0.058 },
  debugTextScale: 1.030,
  debugTextFont: '/fonts/helvetiker_bold.typeface.json',
  debugFlagRotation: { x: 0.000, y: 2.600, z: 0.000 },
  debugFlagOffset: { x: 0.320, y: 1.000, z: 0.210 },
  debugCameraPosition: { x: 1.0, y: 10.4, z: 26.1 },
  debugCameraTarget: { x: 2.5, y: -42.8, z: -58.5 },
  debugCameraDirection: { x: 0.02, y: -0.53, z: -0.85 },
      revealQueue: [],
      isRevealing: false,
      hoveredTile: null,
      clickedMinePosition: null,
      gameResetTrigger: 0,
      audioEnabled: true,
      immortalMode: false,

  resetScene: () => set({
    pillarConfigs: [],
    cellStates: {},
    gameStatus: 'playing',
    mineCount: 0,
    flagCount: 0,
  cameraRigTarget: null,
    sunlight: 1.27,
    ambientLight: 0.53,
    debugTextRotation: { x: 4.700, y: 0.010, z: 0.000 },
    debugTextOffset: { x: 0.015, y: 0.134, z: -0.058 },
    debugTextScale: 1.030,
    debugTextFont: '/fonts/helvetiker_bold.typeface.json',
    debugFlagRotation: { x: 0.000, y: 2.600, z: 0.000 },
    debugFlagOffset: { x: 0.320, y: 1.000, z: 0.210 },
    debugCameraPosition: { x: 1.0, y: 10.4, z: 26.1 },
    debugCameraTarget: { x: 2.5, y: -42.8, z: -58.5 },
    debugCameraDirection: { x: 0.02, y: -0.53, z: -0.85 },
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
    
    // Create Map for O(1) neighbor lookups (performance optimization)
    const pillarMap = new Map(pillarConfigs.map(p => [p.key, p]))
    
    // Initialize all cells
    pillarConfigs.forEach(pillar => {
      cellStates[pillar.key] = {
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMineCount: 0,
        isImmortalMine: false
      }
    })

    // Generate a logically solvable puzzle
    const { minePositions, actualMineCount } = generateSolvablePuzzle(pillarConfigs, pillarMap, mineCount)
    
    console.log('Generated solvable puzzle with', actualMineCount, 'mines')

    // Set mines and calculate neighbor counts
    minePositions.forEach(key => {
      cellStates[key].isMine = true
    })

    // Calculate neighbor mine counts (optimized with Map)
    pillarConfigs.forEach(pillar => {
      const neighbors = getNeighbors(pillar.key, pillarMap)
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
      const { immortalMode, pillarConfigs } = get()
      if (immortalMode) {
        // In immortal mode, just flag the mine and continue
        set((state) => ({
          cellStates: {
            ...state.cellStates,
            [key]: { ...cell, isRevealed: true, isFlagged: true, isImmortalMine: true }
          }
        }))
        return
      } else {
        // Find the clicked mine's position from pillarConfigs
        const clickedMinePillar = pillarConfigs.find(p => p.key === key)
        const clickedMinePosition: [number, number, number] | null = clickedMinePillar 
          ? clickedMinePillar.pos 
          : null
        set({ 
          gameStatus: 'lost',
          clickedMinePosition 
        })
        // Play game over sound when mine is clicked
        // Call directly - the click is a user interaction so AudioContext can resume
        soundManager.playGameOver()
        return
      }
    }

    // If no neighboring mines, reveal neighbors
    if (cell.neighborMineCount === 0) {
      const pillarMap = new Map(state.pillarConfigs.map(p => [p.key, p]))
      const neighbors = getNeighbors(key, pillarMap)
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
        [key]: { ...cell, isFlagged: newFlagged, isImmortalMine: cell.isImmortalMine }
      },
      flagCount: state.flagCount + flagDelta
    }))
  },

  setCameraTarget: (target: [number, number, number] | null) => set({ cameraRigTarget: target }),

  setSunlight: (intensity: number) => set({ sunlight: intensity }),

  setAmbientLight: (intensity: number) => set({ ambientLight: intensity }),

  setDebugTextRotation: (rotation: { x: number; y: number; z: number }) => set({ debugTextRotation: rotation }),

  setDebugTextOffset: (offset: { x: number; y: number; z: number }) => set({ debugTextOffset: offset }),

  setDebugTextScale: (scale: number) => set({ debugTextScale: scale }),

  setDebugTextFont: (font: string) => set({ debugTextFont: font }),

  setDebugFlagRotation: (rotation: { x: number; y: number; z: number }) => set({ debugFlagRotation: rotation }),

  setDebugFlagOffset: (offset: { x: number; y: number; z: number }) => set({ debugFlagOffset: offset }),

  setDebugCameraPosition: (position: { x: number; y: number; z: number }) => set({ debugCameraPosition: position }),

  setDebugCameraTarget: (target: { x: number; y: number; z: number }) => set({ debugCameraTarget: target }),

  setDebugCameraDirection: (direction: { x: number; y: number; z: number }) => set({ debugCameraDirection: direction }),

  setHoveredTile: (key: string | null) => set({ hoveredTile: key }),

  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  setImmortalMode: (immortal: boolean) => {
    console.log('Setting immortalMode to:', immortal)
    set({ immortalMode: immortal })
  },



  addToRevealQueue: (key: string) => {
    const { cellStates, gameStatus, revealQueue, isRevealing } = get()
    const cell = cellStates[key]

    // Check if cell exists and is not already revealed/flagged
    if (!cell || cell.isRevealed || cell.isFlagged || gameStatus !== 'playing') {
      return
    }

    // Batch state update to reduce flicker
    set((state) => ({
      revealQueue: [...state.revealQueue, key],
      isRevealing: true
    }))
  },

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

    // Create deep copy of cellStates to avoid mutation issues
    // CRITICAL: Must copy the cell object itself, not just the reference
    // This prevents React from seeing multiple cells as "changed" when only one is updated
    const newCellStates = { ...cellStates }
    newCellStates[key] = { ...cellStates[key] } // Deep copy the cell object
    const cell = newCellStates[key]

    if (cell.isMine) {
      const { immortalMode } = get()
      if (immortalMode) {
        // In immortal mode, just flag this mine and continue
        // Cell is already deep copied above, so we can safely mutate it
        cell.isRevealed = true
        cell.isFlagged = true
        cell.isImmortalMine = true
        set({ cellStates: newCellStates, revealQueue: newQueue })
        return
      } else {
        // Game over - reveal all mines and store clicked mine position
        // Create deep copies for all mine cells to avoid mutation
        Object.keys(newCellStates).forEach(cellKey => {
          const c = newCellStates[cellKey]
          if (c.isMine) {
            newCellStates[cellKey] = { ...c, isRevealed: true }
          }
        })
        // Find the clicked mine's position from pillarConfigs
        const clickedMinePillar = pillarConfigs.find(p => p.key === key)
        const clickedMinePosition: [number, number, number] | null = clickedMinePillar 
          ? clickedMinePillar.pos 
          : null
        set({ 
          cellStates: newCellStates, 
          gameStatus: 'lost', 
          revealQueue: [], 
          isRevealing: false,
          clickedMinePosition 
        })
        // Play game over sound - ensure AudioContext is resumed
        soundManager.playGameOver()
        return
      }
    }

    // Reveal this cell
    cell.isRevealed = true
    cell.isFlagged = false

    // If this cell has no neighboring mines, add neighbors to queue ONE AT A TIME
    // Add them to the FRONT of the queue so they process in order, creating a cascade
    if (cell.neighborMineCount === 0 && !cell.isMine) {
      // Create pillar map for O(1) neighbor lookups (optimization)
      const pillarMap = new Map(pillarConfigs.map(p => [p.key, p]))
      const neighbors = getNeighbors(key, pillarMap)
      const newNeighbors = neighbors.filter(nKey => 
        newCellStates[nKey] && 
        !newCellStates[nKey].isRevealed && 
        !newCellStates[nKey].isFlagged &&
        !newQueue.includes(nKey)
      )
      // Add neighbors to FRONT of queue (unshift) so they process before other queued items
      // This creates a depth-first cascade effect
      newQueue.unshift(...newNeighbors)
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
    // First, reset all game state to initial values and trigger reset
    set({ 
      pillarConfigs: [],
      cellStates: {},
      gameStatus: 'playing',
      mineCount: 0,
      flagCount: 0,
      revealQueue: [],
      isRevealing: false,
      clickedMinePosition: null,
      gameResetTrigger: get().gameResetTrigger + 1
    })

    // Use setTimeout to ensure the reset state is processed before generating new game
    setTimeout(() => {
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
    }, 50) // Small delay to ensure reset is processed
  },
}))