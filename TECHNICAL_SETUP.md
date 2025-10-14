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
