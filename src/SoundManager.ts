// Simple sound manager for click sounds
class SoundManager {
  private audioContext: AudioContext | null = null
  private clickBuffer: AudioBuffer | null = null
  private audioEnabled: boolean = true

  constructor() {
    this.initAudio()
  }

  setAudioEnabled(enabled: boolean) {
    this.audioEnabled = enabled
  }

  private async initAudio() {
    try {
      this.audioContext = new AudioContext()
      await this.createClickSound()
    } catch (error) {
      console.warn('Audio not available:', error)
    }
  }

  private async createClickSound() {
    if (!this.audioContext) return

    // Create a very subtle, short click sound
    const sampleRate = this.audioContext.sampleRate
    const duration = 0.02 // 20ms - extremely short
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate a gentle tap sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-t * 100) // Extremely quick decay
      const frequency = 2000 // Simple, clean frequency
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.08 // Very quiet
    }

    this.clickBuffer = buffer
  }

  playClick() {
    if (!this.audioEnabled || !this.audioContext || !this.clickBuffer) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = this.clickBuffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch (error) {
      console.warn('Could not play click sound:', error)
    }
  }

  playVictory() {
    if (!this.audioEnabled || !this.audioContext) return

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
}

// Export singleton instance
export const soundManager = new SoundManager()