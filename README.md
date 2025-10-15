# Hexa Away 3D - Advanced Hexagonal Coin Game

An advanced 3D hexagonal board game built with React Three Fiber, featuring directional coin movement, physics-based interactions, and strategic gameplay mechanics.

## Features

- **Dynamic Hexagonal Grid**: 10×10 grid with randomly placed pillars and gaps
- **Directional Coin System**: 6 unique movement directions with colored arrows
- **Physics-Based Movement**: Smooth coin animations with collision detection
- **Strategic Gameplay**: Move coins to lower pillars or flip them into the void
- **Camera Focus System**: Automatic camera tracking of coin movements
- **Performance Monitoring**: Real-time FPS counter and performance metrics

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

### Coin Movement System
- Each pillar contains 2-10 hexagonal coins (segments)
- Coins have directional arrows indicating movement direction
- **6 Movement Directions**: Red (right), Green (up-left), Yellow (up-right), Blue (left), Cyan (down-left), Magenta (down-right)
- Click any coin to attempt movement in its direction

### Movement Rules
- **Valid Move**: Coin can move to a pillar of equal or lower height
- **Blocked Move**: Coin shakes if target pillar is taller
- **Void Drop**: Coin flips into void if no target pillar exists (+1 point)
- **Height Restriction**: Coins can only move to pillars they can "reach"

### Physics & Animation
- **Smooth Transitions**: Linear interpolation for coin movement
- **Flipping Animation**: 180-degree rotation during movement
- **Blocked Feedback**: Rapid shaking animation for invalid moves
- **Gravity Stacking**: Coins stack naturally with slight horizontal randomness

## Controls

- **Mouse**: Left-click and drag to rotate camera
- **Mouse Wheel**: Zoom in/out
- **Right-click and drag**: Pan camera
- **Click Coins**: Interact with individual coins for movement

## Visual Design

- **Background**: Dark navy blue (`#2c3e50`) with atmospheric fog
- **Base**: Casino green plane (`#0F5132`) for contrast
- **Coins**: Creamy white hexagonal segments with subtle variations
- **Arrows**: Colored directional indicators (red, green, yellow, blue, cyan, magenta)
- **Lighting**: Multi-directional studio lighting with soft shadows

## Scoring System

- **Void Drops**: +1 point per coin successfully flipped into void
- **Strategic Moves**: Bonus points for complex multi-step movements
- **Height Management**: Points for maintaining optimal pillar heights

## Development

The project structure:
- `src/App.tsx` - Main application component with canvas setup
- `src/Scene.tsx` - 3D scene, lighting, and camera focus system
- `src/HexGrid.tsx` - Hexagonal grid generation with random gaps
- `src/Pillar.tsx` - Individual pillar with coin management and physics
- `src/store.ts` - Global state management for game state
- `src/FpsCounter.tsx` - Performance monitoring component

## Live Demo

🌐 **Play Online**: [https://ozlphrt.github.io/Hexa-away-3D](https://ozlphrt.github.io/Hexa-away-3D)

Built as an advanced proof-of-concept for strategic hexagonal board games with sophisticated 3D interactions and physics-based gameplay.
