/* global process */
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    define: {
      __supabase_config: JSON.stringify({
        url: env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
        anonKey: env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'
      }),
      __app_id: JSON.stringify(env.VITE_APP_ID || 'default-app-id')
    }
  }
})
