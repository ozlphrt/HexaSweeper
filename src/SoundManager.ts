// Advanced Sound Manager for realistic domino tile interactions
class SoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()

  constructor() {
    this.initAudioContext()
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContext()
      await this.createSounds()
    } catch (error) {
      console.warn('Audio context initialization failed:', error)
    }
  }

  private async createSounds() {
    if (!this.audioContext) return

    // Create domino tile click sound (when picked up/moved)
    const clickSound = this.createDominoClickSound()
    this.sounds.set('coinFlip', clickSound)

    // Create domino tile clack sound (when landing/stacking)
    const clackSound = this.createDominoClackSound()
    this.sounds.set('coinDrop', clackSound)

    // Create domino tile blocked sound (when can't move)
    const blockedSound = this.createDominoBlockedSound()
    this.sounds.set('blocked', blockedSound)

    // Create domino tile falling into void sound
    const voidSound = this.createDominoVoidSound()
    this.sounds.set('voidDrop', voidSound)
  }

  // Generate white noise for domino texture
  private generateWhiteNoise(length: number): Float32Array {
    const noise = new Float32Array(length)
    for (let i = 0; i < length; i++) {
      noise[i] = (Math.random() * 2 - 1) * 0.1
    }
    return noise
  }

  // Generate wooden click envelope
  private generateWoodenEnvelope(length: number, attackTime: number, decayTime: number): Float32Array {
    const envelope = new Float32Array(length)
    const attackSamples = Math.floor(attackTime * this.audioContext!.sampleRate)
    const decaySamples = Math.floor(decayTime * this.audioContext!.sampleRate)
    
    for (let i = 0; i < length; i++) {
      if (i < attackSamples) {
        // Sharp attack
        envelope[i] = i / attackSamples
      } else if (i < attackSamples + decaySamples) {
        // Exponential decay
        const decayProgress = (i - attackSamples) / decaySamples
        envelope[i] = Math.exp(-decayProgress * 4)
      } else {
        envelope[i] = 0
      }
    }
    
    return envelope
  }

  private createDominoClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const duration = 0.01
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      
      // Simple, clean click - just a short burst of high frequency
      const click = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 200)
      
      data[i] = click * 0.3
    }
    
    return buffer
  }

  private createDominoClackSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const duration = 0.01
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      
      // Simple, clean click - just a short burst of high frequency
      const click = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 200)
      
      data[i] = click * 0.3
    }
    
    return buffer
  }

  private createDominoBlockedSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const duration = 0.01
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      
      // Simple, clean click - just a short burst of high frequency
      const click = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 200)
      
      data[i] = click * 0.3
    }
    
    return buffer
  }

  private createDominoVoidSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const duration = 0.01
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      const t = i / this.audioContext.sampleRate
      
      // Simple, clean click - just a short burst of high frequency
      const click = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 200)
      
      data[i] = click * 0.3
    }
    
    return buffer
  }

  public playSound(soundName: string, volume: number = 0.5) {
    if (!this.audioContext || !this.sounds.has(soundName)) return

    const buffer = this.sounds.get(soundName)!
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    
    source.buffer = buffer
    gainNode.gain.value = volume
    
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    source.start()
  }

  public playCoinFlip(volume: number = 0.4) {
    this.playSound('coinFlip', volume)
  }

  public playCoinDrop(volume: number = 0.5) {
    this.playSound('coinDrop', volume)
  }

  public playBlocked(volume: number = 0.3) {
    this.playSound('blocked', volume)
  }

  public playVoidDrop(volume: number = 0.6) {
    this.playSound('voidDrop', volume)
  }
}

// Export singleton instance
export const soundManager = new SoundManager()
