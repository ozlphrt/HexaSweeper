# Performance Analysis & Bottlenecks

## Current State
- **Grid Size**: 50×50 hex grid (~700-750 visible cells after circular boundary + gaps)
- **Render Load**: ~700+ React components (Pillar) + Text components + Flags
- **Current FPS**: ~12 FPS reported on some devices

## Major Bottlenecks Identified

### 1. **Component Count (CRITICAL - ~700+ components)**
**Location**: `src/HexGrid.tsx`, `src/Pillar.tsx`
- Each cell is a full React component with its own lifecycle
- 700+ `Pillar` components = 700+ React components rendering
- Each has multiple hooks (`useFrame`, `useState`, `useMemo`, `useRef`)
- React reconciliation overhead is massive

**Impact**: 🔴 HIGH - This is likely the #1 bottleneck
**Fix Priority**: CRITICAL

### 2. **useFrame Hook Overhead (HIGH)**
**Location**: `src/Pillar.tsx` (lines 203, 599)
- Each Pillar has **2 useFrame hooks**:
  1. Text position/rotation update (lines 203-235)
  2. Animation/falling logic (lines 599-608)
- 700+ components × 2 useFrame hooks = **1400+ function calls per frame**
- Each useFrame reads from store (`useStore.getState()`) every frame

**Impact**: 🔴 HIGH
**Fix Priority**: CRITICAL

### 3. **Store Subscription Pattern**
**Location**: `src/Pillar.tsx` (line 138)
- Currently using selective subscriptions (good!)
- BUT: Still subscribing to `cellState`, `gameStatus`, etc.
- Any store change triggers re-render of affected Pillars

**Impact**: 🟡 MEDIUM
**Fix Priority**: HIGH

### 4. **Geometry Creation (MEDIUM)**
**Location**: `src/Pillar.tsx` (line 281)
- Each Pillar creates its own geometry via `useMemo`
- 700+ geometries, but they're cached (same radius)
- Geometry itself is shared via `useMemo`, but each component has overhead

**Impact**: 🟡 MEDIUM (mitigated by useMemo)
**Fix Priority**: MEDIUM

### 5. **Neighbor Calculation (MEDIUM)**
**Location**: `src/store.ts` (line 21), `src/Pillar.tsx` (line 15)
- `getNeighbors()` uses `pillarConfigs.some()` - O(n) lookup
- Called during initialization and potentially during gameplay
- For 700 cells, this is ~700 × 6 × 700 = significant overhead

**Impact**: 🟡 MEDIUM (mostly initialization cost)
**Fix Priority**: MEDIUM

### 6. **Text Component Rendering (MEDIUM)**
**Location**: `src/Pillar.tsx` (line 750+)
- Each revealed cell with neighbors renders a `Text` component
- Text components are expensive (canvas-based textures)
- Conditional rendering helps, but still many Text components

**Impact**: 🟡 MEDIUM
**Fix Priority**: MEDIUM

### 7. **Flag Animation Mixers (LOW-MEDIUM)**
**Location**: `src/Pillar.tsx` (line 92-100)
- Each flagged tile has an animation mixer updating every frame
- Animation update throttled to 60fps (16ms) but still overhead
- Multiply by number of flagged tiles

**Impact**: 🟢 LOW-MEDIUM (depends on flag count)
**Fix Priority**: LOW

## Optimization Recommendations (Priority Order)

### 🔴 CRITICAL - Immediate Impact

#### 1. **Instanced Rendering**
**Current**: 700+ individual React components
**Proposed**: Single `InstancedMesh` for all pillars
**Impact**: 10-50x performance improvement
**Complexity**: HIGH (requires refactor)
**Files**: `src/Pillar.tsx`, `src/HexGrid.tsx`

**Implementation**:
- Use Three.js `InstancedMesh` to render all pillars in one draw call
- Move state management to arrays/buffers
- Update only changed instances
- Keep React components for interactivity only (raycasting)

#### 2. **Reduce useFrame Calls**
**Current**: 2 useFrame hooks × 700 components = 1400+ calls/frame
**Proposed**: Single useFrame in parent component
**Impact**: 10-20x reduction in function calls
**Complexity**: MEDIUM
**Files**: `src/Pillar.tsx`, `src/HexGrid.tsx`

**Implementation**:
- Move text position updates to single `useFrame` in `HexGrid`
- Update all text positions in batch
- Only update changed cells (dirty flag system)

#### 3. **Optimize Store Subscriptions**
**Current**: Each Pillar subscribes to multiple store values
**Proposed**: Use refs + single store read per frame
**Impact**: Eliminate unnecessary re-renders
**Complexity**: LOW-MEDIUM
**Files**: `src/Pillar.tsx`

**Implementation**:
- Read from store only in useFrame (already partially done)
- Use `React.memo` with custom comparison
- Split cell state into smaller chunks

### 🟡 HIGH - Significant Impact

#### 4. **Optimize Neighbor Lookup**
**Current**: O(n) array.some() lookup per neighbor check
**Proposed**: Use Map/Set for O(1) lookups
**Impact**: Faster initialization
**Complexity**: LOW
**Files**: `src/store.ts`

**Implementation**:
```typescript
// Create lookup map once
const pillarMap = new Map(pillarConfigs.map(p => [p.key, p]))
// O(1) lookup instead of O(n)
```

#### 5. **Batch State Updates**
**Current**: Individual state updates trigger re-renders
**Proposed**: Batch updates using `unstable_batchedUpdates` or Zustand batching
**Impact**: Reduce render cascades
**Complexity**: LOW
**Files**: `src/store.ts`

#### 6. **Geometry Sharing**
**Current**: Each Pillar creates geometry (but cached)
**Proposed**: Single shared geometry for all pillars
**Impact**: Memory savings
**Complexity**: LOW
**Files**: `src/Pillar.tsx`

### 🟢 MEDIUM - Nice to Have

#### 7. **LOD (Level of Detail)**
- Reduce detail for distant pillars
- Cull off-screen pillars (frustum culling)
**Complexity**: MEDIUM-HIGH

#### 8. **Text Rendering Optimization**
- Use texture atlas for numbers instead of individual Text components
- Or use instanced text rendering
**Complexity**: HIGH

#### 9. **Animation Optimization**
- Only animate visible/flagged tiles
- Use shared animation mixer for flags
**Complexity**: MEDIUM

## Quick Wins (Low Complexity, Medium Impact)

1. **Memoize Pillar components** - `React.memo` with shallow compare
2. **Reduce useFrame frequency** - Only update visible/active cells
3. **Optimize neighbor lookup** - Use Map instead of array.some()
4. **Geometry sharing** - Single shared geometry instance
5. **Batch store updates** - Reduce render cascades

## Performance Targets

- **Current**: ~12 FPS
- **Target**: 60 FPS
- **Minimum Acceptable**: 30 FPS

## Recommended Implementation Order

1. ✅ Quick wins (1-2 days) - Should get to ~30 FPS
2. ⚠️ useFrame consolidation (2-3 days) - Should get to ~45 FPS
3. ⚠️ Instanced rendering (1 week) - Should achieve 60 FPS

## Metrics to Track

- Frame time (ms)
- Draw calls
- Triangles rendered
- React re-renders per frame
- useFrame call count
- Memory usage

