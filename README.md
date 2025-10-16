# Hexagrid Minesweeper - Advanced 3D Hexagonal Minesweeper Game

A modern, immersive 3D implementation of the classic Minesweeper game built with React Three Fiber, featuring hexagonal tiles, realistic physics, dynamic lighting, and engaging sound effects.

## 🎮 Game Features

### Core Gameplay
- **Classic Minesweeper Rules**: Left-click to reveal cells, right-click to flag mines
- **Multiple Difficulty Levels**: Beginner (9x9), Intermediate (16x16), Expert (16x30)
- **Smart Mine Placement**: First click is always safe
- **Auto-reveal**: Empty cells automatically reveal adjacent safe areas

### 3D Visual Experience
- **Immersive 3D Environment**: Full 3D minefield with depth and perspective
- **Dynamic Lighting**: Realistic shadows and lighting effects
- **Smooth Animations**: Fluid cell reveals, flag placements, and mine explosions
- **Camera Controls**: Orbit, zoom, and pan for optimal viewing angles

### Advanced Features
- **Timer System**: Track your solving time with precision
- **Mine Counter**: Real-time display of remaining mines
- **Game Statistics**: Track wins, losses, and best times
- **Restart Functionality**: Quick game reset with new mine placement
- **Sound Effects**: Immersive audio feedback for all interactions

## 🎯 Game Mechanics

### Cell States
- **Hidden**: Covered cell with unknown content
- **Revealed**: Exposed cell showing number or empty space
- **Flagged**: Marked as potential mine location
- **Mine**: Explosive cell that ends the game when revealed

### Number System
- **0-8**: Indicates number of adjacent mines
- **Empty (0)**: Automatically reveals all adjacent cells
- **Mine**: Triggers game over with explosion effect

### Win/Lose Conditions
- **Win**: All non-mine cells revealed
- **Lose**: Mine cell revealed (explosion animation)

## 🎨 Visual Design

### 3D Environment
- **Grid Layout**: Clean, organized square grid in 3D space
- **Cell Design**: Modern, minimalist cell appearance
- **Color Coding**: Intuitive color scheme for different cell states
- **Depth Perception**: Clear visual hierarchy with shadows and lighting

### UI Elements
- **Glassmorphism Design**: Modern, translucent UI components
- **Real-time Stats**: Live updates for timer and mine counter
- **Responsive Layout**: Adapts to different screen sizes
- **Smooth Transitions**: Polished animations throughout

## 🎵 Audio Experience

### Sound Effects
- **Cell Click**: Satisfying click feedback for cell interactions
- **Flag Placement**: Distinct sound for flagging/unflagging
- **Mine Explosion**: Dramatic explosion sound for game over
- **Victory**: Celebratory sound for successful completion
- **Ambient**: Subtle background audio for immersion

## 🛠️ Technical Stack

### Core Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and enhanced development experience
- **React Three Fiber**: React renderer for Three.js
- **Three.js**: 3D graphics library for WebGL rendering
- **Zustand**: Lightweight state management

### 3D Graphics
- **@react-three/drei**: Useful helpers and components for R3F
- **WebGL**: Hardware-accelerated 3D rendering
- **GLTF Models**: 3D assets for enhanced visual experience

### Development Tools
- **Vite**: Fast build tool and development server
- **GitHub Pages**: Automated deployment and hosting
- **ESLint**: Code quality and consistency

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Modern web browser with WebGL support

### Installation
   ```bash
# Clone the repository
git clone https://github.com/ozlphrt/minesweeper-3d.git
cd minesweeper-3d

# Install dependencies
   npm install

# Start development server
   npm run dev
   ```

### Building for Production
```bash
# Build the project
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## 🎮 How to Play

1. **Start the Game**: Choose your difficulty level
2. **Reveal Cells**: Left-click on cells to reveal their content
3. **Flag Mines**: Right-click to flag suspected mine locations
4. **Use Numbers**: Numbers indicate adjacent mine count
5. **Win**: Reveal all non-mine cells to win
6. **Avoid Mines**: Don't click on mine cells or you'll lose!

## 🌐 Live Demo

Play the game online: [Minesweeper 3D](https://ozlphrt.github.io/minesweeper-3d)

## 📁 Project Structure

```
src/
├── App.tsx              # Main application component
├── Scene.tsx            # 3D scene setup and lighting
├── MineField.tsx        # Game board and grid management
├── Cell.tsx             # Individual mine cell component
├── GameUI.tsx           # User interface and controls
├── store.ts             # Game state management
├── SoundManager.ts      # Audio system
└── styles.css           # Global styles and UI components
```

## 🔧 Development

### Key Components
- **MineField**: Manages the game grid and mine placement
- **Cell**: Handles individual cell interactions and rendering
- **GameUI**: Provides game controls and statistics display
- **SoundManager**: Manages all audio feedback

### State Management
- Game board state (mine positions, revealed cells, flags)
- Game statistics (time, mine count, win/loss tracking)
- UI state (difficulty selection, game status)

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

---

**Enjoy playing Minesweeper 3D!** 🎮💣