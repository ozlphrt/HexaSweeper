# Debug Panel Documentation

## Overview
The debug panel uses `dat.gui` to provide real-time controls for game settings, camera information, text/flag positioning, lighting, and sound configuration.

## Key Components

### Camera Tracking
- **Location**: `src/CameraTracker.tsx` updates camera position/target/direction every 100ms
- **Display**: `src/DebugPanel.tsx` shows camera values in real-time
- **Update Mechanism**: Uses `useEffect` that triggers when `debugCameraPosition`, `debugCameraTarget`, or `debugCameraDirection` change
- **Implementation**: Camera data bound to `controlsRef.current.cameraData` object, which dat.gui's `.listen()` monitors for changes

### Control Binding Pattern
All controls follow this pattern:
1. Store data objects in `controlsRef.current` to persist across renders
2. Use `.listen()` on display-only controls (camera info)
3. Use `.onChange()` handlers that:
   - Update the bound object property
   - Update React state using functional updates: `setState(prev => ({ ...prev, key: value }))`

### Sound Controls
- **Click Sound**: Uses slider (1-5) to select between different click sound styles
- **Game Over Sound**: Uses slider (1-5) to select between different game over sound styles
- **Implementation**: Sounds captured synchronously at start of play functions to handle async AudioContext resume correctly

### Slider Controls
All sliders (text offset/rotation/scale, flag offset/rotation, lighting) use:
- Data objects stored in `controlsRef.current` 
- Functional state updates to avoid stale closure issues
- Immediate visual feedback

## Important Notes
- **DO NOT** change the debug panel implementation unless explicitly requested
- Camera updates work via `useEffect` dependency on camera state values
- All slider controls use functional updates to prevent stale closure bugs
- Sound controls require capturing style values before async AudioContext operations

## Known Issues & Fixes

### Text Numbers Disappearing When Adjusting Offset Sliders (FINAL FIX)
- **Issue**: Numbers disappear when text offset sliders are moved in the debug panel
- **Root Cause**: 
  1. `DebugPanel` subscribed to `debugTextOffset` via `useStore(state => state.debugTextOffset)`
  2. When slider changed, `setDebugTextOffset()` updated the store, triggering React re-renders
  3. `Pillar` components also subscribed to `debugTextOffset` via `useStore()`, causing ALL Pillar components to re-render
  4. React's reconciliation during re-render unmounted/remounted the Text components
  5. React Three Fiber's Text component loses visual state when unmounted, causing disappearance
  
- **Fix Applied (Final Solution)**:
  1. **Removed React subscriptions** in `DebugPanel.tsx`:
     - No longer use `useStore()` hook for `debugTextOffset`
     - Removed `debugTextOffset` and `setDebugTextOffset` from component dependencies
  2. **Direct store access**:
     - Sliders read initial values via `useStore.getState().debugTextOffset` (no subscription)
     - Slider `onChange` handlers call `useStore.getState().setDebugTextOffset()` directly
     - This updates the store WITHOUT triggering React re-renders
  3. **One-way sync** (optional):
     - Used Zustand's `subscribe()` to update dat.gui display when store changes externally
     - This only updates the UI display, doesn't cause React re-renders
  4. **Pillar already optimized**:
     - `Pillar.tsx` reads offset values in `useFrame` via `useStore.getState()` (no subscription)
     - Position updates happen via ref in `useFrame`, so no re-renders occur
     - Text component stays mounted because parent never re-renders
  
- **Why Previous Fixes Failed**:
  - Using refs, memoization, stable keys, etc. didn't help because the parent `Pillar` was still re-rendering
  - The issue was the re-render cascade caused by Zustand subscriptions, not the Text component itself
  
- **Key Insight**: 
  - The problem wasn't the Text component - it was parent re-renders caused by store subscriptions
  - By eliminating the subscription, we eliminated the re-renders, so Text components never unmount
  
- **Location**: 
  - `src/DebugPanel.tsx` lines 121-189 (new offset slider implementation)
  - `src/Pillar.tsx` lines 186-219 (useFrame reading from store via getState)
  
- **Pattern for Future**: 
  - When debug controls cause component re-render issues, use `useStore.getState()` for direct access instead of `useStore()` hooks
  - This prevents React re-render cascades while still allowing store updates

---

## AudioContext Initialization Fix (2024)

**Problem:** 
- Screen flicker on first tile click on fresh page load
- AudioContext warning: "The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture"
- AudioContext creation blocking initial page load

**Root Cause:**
- AudioContext was created synchronously in SoundManager constructor, blocking page load
- AudioContext resume was attempted on mouse move events (not valid user gestures per browser autoplay policy)
- AudioContext resume was wrapped in microtask (`Promise.resolve().then()`), breaking user gesture context requirement

**Solution:**
1. **Deferred AudioContext Initialization** - SoundManager constructor now defers initialization using `requestIdleCallback` or `setTimeout`, preventing blocking during page load
2. **User Gesture Requirements** - AudioContext resume only happens on explicit user gestures:
   - `pointerdown`
   - `mousedown`  
   - `touchstart`
   - `keydown`
   - Removed `pointermove` and `mousemove` (don't count as valid user gestures)
3. **Direct Resume Call** - `audioCtx.resume()` is called directly in event handler (not wrapped in Promise), preserving user gesture context
4. **Lazy Initialization Fallback** - All sound play methods (`playClick`, `playVictory`, `playGameOver`) check if AudioContext exists and initialize on-demand if needed

**Files Changed:**
- `src/SoundManager.ts` - Deferred initialization in constructor, lazy init in play methods
- `src/App.tsx` - Pre-initialization handlers use only valid user gesture events
- `src/Pillar.tsx` - Removed duplicate AudioContext resume (handled globally)

**Result:** No flicker on first click, no AudioContext warnings, faster initial page load.

---

## Heatmap Saturation Enhancement (2024)

**Problem:**
- Heatmap colors were too desaturated, fading to white
- Hottest tiles didn't match visual intensity of mine tiles

**Solution:**
- **Hottest Color:** `rgb(244, 75, 62)` - One tone less saturated than mine red `#f44336` (rgb(244, 67, 54))
- **Close Range (0-0.33):** Vibrant red → orange gradient, more saturated
- **Mid Range (0.33-0.66):** Orange → saturated yellow
- **Far Range (0.66-1.0):** Saturated yellow → light yellow (NOT white - maintains saturation)

**Color Gradient:**
- Close: `rgb(244, 75, 62)` → `rgb(244, 205, 105)`
- Mid: `rgb(255, 205, 105)` → `rgb(255, 255, 50)`
- Far: `rgb(255, 255, 50)` → `rgb(255, 255, 150)`

**Files Changed:**
- `src/Pillar.tsx` - Updated `getCellColor()` heatmap color calculation (lines 385-406)

**Result:** More vibrant, saturated heatmap that clearly shows distance from clicked mine while maintaining visual intensity throughout the gradient.

---

