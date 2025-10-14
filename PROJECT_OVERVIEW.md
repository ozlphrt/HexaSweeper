# Project Overview — Hexa Away 3D (POC)

**Goal:** Visual + physics demo replicating the *look & feel* of “Hexa Away 3D” with natural sandstone hex pillars floating over a void. Orbit camera, diagonal framing, click-to-drop pillars (Rapier), camera pans/zooms to clicked pillar. Minimal glass UI.

## Visual Direction
- **Theme:** Natural **sandstone** pillars over a **void**
- **Grid:** ~**10×10 hex pillars**, random heights
- **Lighting:** Soft directional sunlight + subtle fog (neutral daylight)
- **Camera:** Orbit + **offset diagonal** framing; on click, smoothly focus on target pillar
- **UI:** Glass-morphism panel with Reset + Sunlight slider

## Interactions
- **Click/tap** a pillar → it switches from **fixed** to **dynamic** and falls under gravity
- Camera **zooms/pans** toward the clicked pillar for a cinematic cue
- Reset clears focus (soft reset); hard refresh resets bodies

## Tech Stack
- **React + React Three Fiber (r3f) + drei**
- **@react-three/rapier** (physics, high-perf WASM)
- **Zustand** for minimal state
- Vite + TypeScript

## Why this POC?
- Establishes the **visual identity** and **physics feel**
- Clean foundation for later mechanics (chain reactions, procedural collapse, scoring)
- Fits your **Cursor** iterative workflow (modular docs + branches)
