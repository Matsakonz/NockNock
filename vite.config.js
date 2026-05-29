/* global process */
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for development use within vite.config.js if needed
  // In production, Vite handles VITE_ variables automatically
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    // Removed define block as we now use import.meta.env directly in App.jsx
  }
})
