import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // si tu proyecto es React; si no, quita esta línea

export default defineConfig({
  plugins: [react()], // si no usas React, deja plugins: []
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // redirige /api/* al backend FastAPI en el puerto 3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
