import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get git commit hash at build time
function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/HexaSweeper/' : './',
  define: {
    __GIT_COMMIT_HASH__: JSON.stringify(getGitCommitHash()),
  },
})
