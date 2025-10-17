# Technical Setup

## Prereqs
- Node 18+ recommended
- PNPM (preferred) or NPM/Yarn

## Install
```bash
pnpm install
# or: npm install
```

## Run dev
```bash
pnpm dev
# or: npm run dev
```

Open the dev URL printed by Vite (usually http://localhost:5173).

## Build
```bash
pnpm build && pnpm preview
```

## Dependencies
- `react`, `react-dom`
- `three`, `@react-three/fiber`, `@react-three/drei`
- `@react-three/rapier` (Rapier physics bindings)
- `zustand` (state)

## Files
- `src/App.tsx` — Canvas + UI overlay
- `src/Scene.tsx` — Lights, fog, physics world, camera rig
- `src/HexGrid.tsx` — Generates 10×10 hex positions & random heights
- `src/Pillar.tsx` — Hex prism mesh + Rapier body; click → dynamic fall
- `src/store.ts` — global state (sunlight, camera focus, reset)
- `src/styles.css` — glass panel styling

## Critical Implementation Notes

### Text3D Positioning for Mine Count Numbers
**Issue**: Numbers appearing upside down or disappearing during flip animations.

**Root Cause**: Text3D components inside mesh groups inherit the parent mesh's rotation transformations.

**Solution**: 
1. Position Text3D components as siblings to the mesh, not children
2. Remove `Math.PI` from X rotation when Text3D is outside mesh group
3. Use `debugTextRotation.x` directly (not `debugTextRotation.x + Math.PI`)

**Code Pattern**:
```tsx
// ❌ WRONG - Text3D inside mesh (inherits flip rotation)
<mesh>
  <Text3D rotation={[debugTextRotation.x + Math.PI, ...]} />
</mesh>

// ✅ CORRECT - Text3D as sibling to mesh
<mesh />
<Text3D rotation={[debugTextRotation.x, ...]} />
```

**Why This Matters**: 
- Prevents numbers from rotating with tile flip animations
- Maintains proper text orientation
- Ensures numbers remain visible during animations

### Font Offset Controls System
**Issue**: Need to fine-tune positioning of mine count numbers and flag models.

**Solution**: Comprehensive debug controls system with real-time adjustment capabilities.

**Implementation**:
1. **Debug Controls Panel**: Added to top-right of screen with live sliders
2. **Text Offset Controls**: X, Y, Z positioning for mine count numbers
3. **Text Rotation Controls**: X, Y, Z rotation for mine count numbers
4. **Flag Offset Controls**: X, Y, Z positioning for flag models
5. **Flag Rotation Controls**: X, Y, Z rotation for flag models

**Control Features**:
- Range sliders with 0.001 precision for offsets, 0.01 for rotations
- Live value display showing exact coordinates
- Copy-to-clipboard buttons for saving preferred values
- Real-time updates applied to all tiles immediately

**Default Values** (as of latest update):
```typescript
debugTextOffset: { x: -0.240, y: 0.134, z: 0.229 }
debugTextRotation: { x: 4.69, y: 0, z: 0 }
debugFlagOffset: { x: 0.32, y: 1.00, z: 0.21 }
debugFlagRotation: { x: 0, y: 2.6, z: 0 }
```

**Usage Workflow**:
1. Reveal tiles to see numbers/flags
2. Adjust sliders in debug panel (top-right)
3. Watch real-time positioning changes
4. Copy values when satisfied with positioning
5. Update store defaults with preferred values

**Code Location**: `src/App.tsx` - `DebugControls` component