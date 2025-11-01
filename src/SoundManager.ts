// Simple sound manager for click sounds
class SoundManager {
  private audioContext: AudioContext | null = null
  private clickBuffers: Map<number, AudioBuffer> = new Map()
  private audioEnabled: boolean = true
  // Sound style selectors: 1-5 for different sounds
  private gameOverSoundStyle: number = 1 // Default to Deep Explosion
  private clickSoundStyle: number = 5 // Default to Soft Chime

  constructor() {
    // Defer AudioContext initialization to avoid blocking initial page load
    // This prevents the flicker that occurs when AudioContext is created synchronously
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback or setTimeout to defer initialization
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.initAudio()
        }, { timeout: 1000 })
      } else {
        setTimeout(() => {
          this.initAudio()
        }, 0)
      }
    }
  }

  setAudioEnabled(enabled: boolean) {
    this.audioEnabled = enabled
  }

  private async initAudio() {
    try {
      this.audioContext = new AudioContext()
      await this.createAllClickSounds()
      // Game over sounds are generated procedurally, no external files needed
    } catch (error) {
      console.warn('Audio not available:', error)
    }
  }

  private async createAllClickSounds() {
    if (!this.audioContext) return
    
    // Create all click sound variations
    for (let style = 1; style <= 5; style++) {
      const buffer = this.createClickSound(style)
      if (buffer) {
        this.clickBuffers.set(style, buffer)
        console.log('Created click sound buffer for style', style)
      } else {
        console.warn('Failed to create click sound buffer for style', style)
      }
    }
    console.log('All click sound buffers created. Current style:', this.clickSoundStyle)
  }

  private createClickSound(style: number): AudioBuffer | null {
    if (!this.audioContext) return null

    const sampleRate = this.audioContext.sampleRate
    let duration = 0.02
    let buffer: AudioBuffer
    let data: Float32Array

    switch (style) {
      case 1: // Gentle Tap (original)
        duration = 0.02
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
        data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const envelope = Math.exp(-t * 100)
          const frequency = 2000
          data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.08
        }
        break

      case 2: // Deep Thud
        duration = 0.04
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
        data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const envelope = Math.exp(-t * 35) // Slower decay for thud
          const thud = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 25) * 0.15
          const lowRumble = Math.sin(2 * Math.PI * 80 * t) * 0.08
          const quickHit = Math.sin(2 * Math.PI * 500 * t) * Math.exp(-t * 80) * 0.05
          data[i] = (thud + lowRumble + quickHit) * envelope * 0.12
        }
        break

      case 3: // Glass Tinkle
        duration = 0.05
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
        data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const envelope = Math.exp(-t * 25) // Longer decay for glass
          const tinkle1 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 30) * 0.1
          const tinkle2 = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 35) * 0.08
          const tinkle3 = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 40) * 0.06
          const ring = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 20) * 0.04
          data[i] = (tinkle1 + tinkle2 + tinkle3 + ring) * envelope * 0.1
        }
        break

      case 4: // Metallic Tick
        duration = 0.015
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
        data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const envelope = Math.exp(-t * 120)
          const tick = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 100) * 0.1
          const ring = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 80) * 0.05
          data[i] = (tick + ring) * envelope * 0.1
        }
        break

      case 5: // Soft Chime
        duration = 0.04
        buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
        data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate
          const envelope = Math.exp(-t * 40)
          const chime1 = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 30) * 0.08
          const chime2 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 35) * 0.06
          const chime3 = Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 40) * 0.04
          data[i] = (chime1 + chime2 + chime3) * envelope * 0.1
        }
        break

      default:
        return null
    }

    return buffer
  }

  playClick() {
    if (!this.audioEnabled) return
    
    // If AudioContext not initialized yet (deferred), initialize it now
    if (!this.audioContext) {
      this.initAudio().then(() => {
        this.playClickInternal()
      }).catch(() => {})
      return
    }

    // AudioContext should already be resumed by pre-initialization in App.tsx
    // Only resume if still suspended (shouldn't happen with pre-init, but fallback)
    if (this.audioContext.state === 'suspended') {
      // Capture style before async operation
      const currentStyle = this.clickSoundStyle
      // Resume without blocking - play sound after resume completes
      this.audioContext.resume().then(() => {
        this.playClickInternal(currentStyle)
      }).catch(() => {})
      return
    }

    // AudioContext is already running - play immediately
    this.playClickInternal()
  }

  private playClickInternal(capturedStyle?: number) {
    if (!this.audioContext) return

    // Use captured style if provided (for async resume), otherwise read current style
    const style = capturedStyle !== undefined ? capturedStyle : this.clickSoundStyle
    console.log('playClickInternal: using style', style, 'captured:', capturedStyle, 'current:', this.clickSoundStyle)
    let buffer = this.clickBuffers.get(style)
    
    // If buffer doesn't exist, create it immediately
    if (!buffer) {
      console.log('Creating buffer for style', style)
      buffer = this.createClickSound(style)
      if (buffer) {
        this.clickBuffers.set(style, buffer)
      } else {
        // Fallback to style 1 if creation fails
        console.warn('Failed to create buffer for style', style, 'falling back to style 1')
        buffer = this.clickBuffers.get(1)
        if (!buffer) return
      }
    }

    this.playBuffer(buffer)
  }

  private playBuffer(buffer: AudioBuffer) {
    if (!this.audioContext) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch (error) {
      console.warn('Could not play sound:', error)
    }
  }

  // Set which click sound style to use (1-5)
  setClickSoundStyle(style: number) {
    const newStyle = Math.max(1, Math.min(5, Math.round(style)))
    console.log('setClickSoundStyle: setting to', newStyle, 'from', this.clickSoundStyle)
    // Update immediately - this is synchronous
    this.clickSoundStyle = newStyle
    // Ensure buffer exists for the new style (create synchronously)
    if (!this.clickBuffers.has(newStyle)) {
      console.log('Creating buffer for new style', newStyle)
      const buffer = this.createClickSound(newStyle)
      if (buffer) {
        this.clickBuffers.set(newStyle, buffer)
      }
    }
    // Verify it was set
    console.log('setClickSoundStyle: after setting, current style is', this.clickSoundStyle)
  }

  getClickSoundStyle(): number {
    return this.clickSoundStyle
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  playVictory() {
    if (!this.audioEnabled) return
    
    // If AudioContext not initialized yet (deferred), initialize it now
    if (!this.audioContext) {
      this.initAudio().then(() => {
        this.playVictoryInternal()
      }).catch(() => {})
      return
    }
    
    this.playVictoryInternal()
  }
  
  private playVictoryInternal() {
    if (!this.audioContext) return

    try {
      const sampleRate = this.audioContext.sampleRate
      const duration = 1.5 // 1.5 seconds
      const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
      const data = buffer.getChannelData(0)

      // Generate a victory fanfare sound
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate
        const envelope = Math.exp(-t * 2) // Gradual decay
        
        // Create a rising melody
        const note1 = Math.sin(2 * Math.PI * 523.25 * t) * 0.3 // C5
        const note2 = Math.sin(2 * Math.PI * 659.25 * t) * 0.3 // E5
        const note3 = Math.sin(2 * Math.PI * 783.99 * t) * 0.3 // G5
        
        // Add some harmonics for richness
        const harmonic1 = Math.sin(2 * Math.PI * 523.25 * 2 * t) * 0.1
        const harmonic2 = Math.sin(2 * Math.PI * 659.25 * 2 * t) * 0.1
        
        data[i] = (note1 + note2 + note3 + harmonic1 + harmonic2) * envelope * 0.15
      }

      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch (error) {
      console.warn('Could not play victory sound:', error)
    }
  }

  playGameOver() {
    if (!this.audioEnabled) {
      console.log('Audio disabled, skipping game over sound')
      return
    }

    // If AudioContext not initialized yet (deferred), initialize it now
    if (!this.audioContext) {
      this.initAudio().then(() => {
        this.playGameOverProceduralInternalWithStyle(this.gameOverSoundStyle)
      }).catch(() => {})
      return
    }

    try {
      // Always read the current style at the start - before any async operations
      const currentStyle = this.gameOverSoundStyle
      console.log('playGameOver: current style is', currentStyle)
      
      // AudioContext should already be resumed by pre-initialization in App.tsx
      // Only resume if still suspended (shouldn't happen with pre-init, but fallback)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          // After resuming, play the sound with the style we captured
          console.log('AudioContext resumed, playing game over with style', currentStyle)
          this.playGameOverProceduralInternalWithStyle(currentStyle)
        }).catch((err) => {
          console.warn('Could not resume AudioContext:', err)
        })
        return
      }

      // AudioContext is already running, play immediately
      console.log('AudioContext already running, playing game over with style', currentStyle)
      this.playGameOverProceduralInternalWithStyle(currentStyle)
    } catch (error) {
      console.warn('Could not play game over sound:', error)
    }
  }

  // Set which sound style to use (1-5)
  setGameOverSoundStyle(style: number) {
    const newStyle = Math.max(1, Math.min(5, Math.round(style)))
    console.log('setGameOverSoundStyle: setting to', newStyle, 'from', this.gameOverSoundStyle)
    this.gameOverSoundStyle = newStyle
    console.log('setGameOverSoundStyle: after setting, current style is', this.gameOverSoundStyle)
  }

  getGameOverSoundStyle(): number {
    return this.gameOverSoundStyle
  }

  private playGameOverProceduralInternal() {
    // Use the current style
    const style = this.gameOverSoundStyle
    this.playGameOverProceduralInternalWithStyle(style)
  }

  private playGameOverProceduralInternalWithStyle(style: number) {
    if (!this.audioContext) {
      console.warn('AudioContext not available for game over sound')
      return
    }

    try {
      console.log('playGameOverProceduralInternalWithStyle: using style', style, 'current this.gameOverSoundStyle is', this.gameOverSoundStyle)
      
      const sampleRate = this.audioContext.sampleRate
      let buffer: AudioBuffer
      let data: Float32Array

      switch (style) {
        case 1: // Deep Explosion (original)
          buffer = this.audioContext.createBuffer(1, sampleRate * 0.8, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 8)
            const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.4
            const crack = Math.sin(2 * Math.PI * 200 * t * (1 + t * 2)) * 0.3
            const noise = (Math.random() * 2 - 1) * 0.3
            const sizzle = t < 0.2 ? Math.sin(2 * Math.PI * 800 * t) * (1 - t * 5) * 0.2 : 0
            data[i] = (rumble + crack + noise * (1 - t * 1.2) + sizzle) * envelope * 0.4
          }
          break

        case 2: // Sharp Electric Buzz/Shock
          buffer = this.audioContext.createBuffer(1, sampleRate * 0.5, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = Math.exp(-t * 15) // Quick sharp decay
            // Sharp crack with high frequency components
            const sharp = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-t * 30) * 0.6
            const zap = Math.sin(2 * Math.PI * 1200 * t * (1 + t * 4)) * 0.4
            // Electric crackle with more randomness
            const crackle = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.5
            // High frequency sizzle
            const sizzle = Math.sin(2 * Math.PI * 3000 * t) * Math.exp(-t * 40) * 0.3
            data[i] = (sharp + zap + crackle * (1 - t * 2) + sizzle) * envelope * 0.5
          }
          break

        case 3: // Deep Bass Drop with Glitch
          buffer = this.audioContext.createBuffer(1, sampleRate * 1.0, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = Math.exp(-t * 4) // Slower decay
            // Very low frequency rumble that drops
            const freq = 90 - (t * 50) // Drops from 90Hz to 40Hz
            const rumble = Math.sin(2 * Math.PI * freq * t) * 0.7
            // Deep sub-bass
            const sub = Math.sin(2 * Math.PI * 45 * t) * 0.4
            // Mid-bass punch with glitch
            const punch = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 12) * 0.4
            // Glitchy artifact
            const glitch = t < 0.3 ? Math.sin(2 * Math.PI * 500 * t) * Math.exp(-t * 25) * 0.3 : 0
            data[i] = (rumble + sub + punch + glitch) * envelope * 0.5
          }
          break

        case 4: // Metallic Crash with Echo
          buffer = this.audioContext.createBuffer(1, sampleRate * 0.9, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * 8)
            // Sharp initial impact
            const impact = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 35) * 0.6
            // Metallic ringing frequencies with different decays
            const ring1 = Math.sin(2 * Math.PI * 350 * t) * Math.exp(-t * 4) * 0.5
            const ring2 = Math.sin(2 * Math.PI * 700 * t) * Math.exp(-t * 7) * 0.4
            const ring3 = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 10) * 0.3
            // Echo effect at 0.2s delay
            const echo = t > 0.2 ? Math.sin(2 * Math.PI * 400 * (t - 0.2)) * Math.exp(-(t - 0.2) * 8) * 0.2 : 0
            // Some noise for texture
            const chaos = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.25
            data[i] = (impact + ring1 + ring2 + ring3 + echo + chaos * (1 - t * 1.5)) * envelope * 0.4
          }
          break

        case 5: // Quick Pop with Reverb
          buffer = this.audioContext.createBuffer(1, sampleRate * 0.4, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = t < 0.05 ? t / 0.05 : Math.exp(-t * 20) // Quick attack, medium decay
            // Sharp pop with wide frequency range
            const pop = Math.sin(2 * Math.PI * 250 * t) * Math.exp(-t * 45) * 0.7
            // High frequency snap
            const snap = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 60) * 0.5
            // Quick burst of noise
            const burst = (Math.random() * 2 - 1) * Math.exp(-t * 35) * 0.4
            // Subtle reverb tail
            const reverb = t > 0.1 ? Math.sin(2 * Math.PI * 300 * (t - 0.1)) * Math.exp(-(t - 0.1) * 15) * 0.2 : 0
            data[i] = (pop + snap + burst * (1 - t * 3) + reverb) * envelope * 0.6
          }
          break

        default:
          // Fallback to style 1
          buffer = this.audioContext.createBuffer(1, sampleRate * 0.8, sampleRate)
          data = buffer.getChannelData(0)
          for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate
            const envelope = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 8)
            const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.4
            const crack = Math.sin(2 * Math.PI * 200 * t * (1 + t * 2)) * 0.3
            const noise = (Math.random() * 2 - 1) * 0.3
            data[i] = (rumble + crack + noise * (1 - t * 1.2)) * envelope * 0.4
          }
      }

      const source = this.audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch (error) {
      console.warn('Could not play procedural game over sound:', error)
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()