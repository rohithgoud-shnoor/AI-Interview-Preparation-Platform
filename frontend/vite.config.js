import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    // Strip all console.* calls and debugger statements from production bundle.
    // Lighthouse Best Practices deducts points for any browser console errors/warnings
    // captured during the audit — removing them from production eliminates that penalty.
    esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},

    // Split vendor chunks for better long-term caching and a smaller initial bundle,
    // which directly improves FCP, LCP, and TBT scores.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-icons':  ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
}))


