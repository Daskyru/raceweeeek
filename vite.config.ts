import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: false,
    proxy: {
      '/api/openwec': {
        target: 'https://api.openwec.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openwec/, '/api/v1'),
      },
      '/api/openf1': {
        target: 'https://api.openf1.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openf1/, '/v1'),
      },
      '/api/circuit': {
        target: 'https://api.multiviewer.app',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/circuit/, ''),
      },
      '/api/nascar': {
        target: 'https://cf.nascar.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/nascar/, ''),
        headers: {
          Referer: 'https://www.nascar.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      },
    },
  },
})
