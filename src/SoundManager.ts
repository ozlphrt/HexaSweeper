// Simple sound manager for click sounds
class SoundManager {
  private audioContext: AudioContext | null = null
  private clickBuffer: AudioBuffer | null = null

  constructor() {
    this.initAudio()
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
    if (!this.audioContext || !this.clickBuffer) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = this.clickBuffer
      source.connect(this.audioContext.destination)
      source.start()
    } catch (error) {
      console.warn('Could not play click sound:', error)
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()