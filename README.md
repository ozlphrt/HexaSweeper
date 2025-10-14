# Simple Board - 3D Hexagonal Grid

A beautiful 3D hexagonal grid board game prototype built with React Three Fiber, featuring interactive hexagonal pillars made of colored segments.

## Features

- **Perfect Honeycomb Pattern**: Tightly packed hexagonal pillars with natural spacing
- **Interactive Segments**: Click to remove top segments from pillars
- **Directional Color System**: 6 unique muted colors representing movement directions
- **Soft Aesthetics**: Rounded edges, subtle lighting, and elegant materials
- **Smooth Controls**: OrbitControls for intuitive camera movement

## Technical Stack

- **React** - UI framework
- **React Three Fiber** - 3D rendering with Three.js
- **React Three Drei** - Useful helpers and components
- **Zustand** - State management
- **TypeScript** - Type safety
- **Vite** - Build tool

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Game Mechanics

- Each pillar consists of 2-10 hexagonal segments (coins)
- Segments are colored with 6 different muted colors
- Each color represents a unique movement direction
- Click anywhere on a pillar to remove the topmost segment
- Pillars automatically maintain proper stacking without gaps

## Controls

- **Mouse**: Left-click and drag to rotate camera
- **Mouse Wheel**: Zoom in/out
- **Right-click and drag**: Pan camera

## Visual Design

- **Background**: Dark navy blue (`#2c3e50`)
- **Lighting**: Studio setup with soft shadows
- **Materials**: Soft, rounded hexagonal segments with subtle chamfering
- **Colors**: Muted palette for easy viewing

## Development

The project structure:
- `src/App.tsx` - Main application component
- `src/Scene.tsx` - 3D scene setup and lighting
- `src/HexGrid.tsx` - Hexagonal grid generation
- `src/Pillar.tsx` - Individual pillar with segments
- `src/store.ts` - Global state management

Built as a proof-of-concept for a hexagonal board game with smooth 3D interactions.
