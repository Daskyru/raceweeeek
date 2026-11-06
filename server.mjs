import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT) || 3000

const app = express()

app.use(
  '/api/openf1',
  createProxyMiddleware({
    target: 'https://api.openf1.org/v1',
    changeOrigin: true,
  }),
)

app.use(
  '/api/openwec',
  createProxyMiddleware({
    target: 'https://api.openwec.com/api/v1',
    changeOrigin: true,
  }),
)

app.use(
  '/api/circuit',
  createProxyMiddleware({
    target: 'https://api.multiviewer.app',
    changeOrigin: true,
  }),
)

app.use(express.static(distDir, { index: false }))

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next()
    return
  }
  if (req.path.startsWith('/api/')) {
    next()
    return
  }
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, '0.0.0.0', () => {
  console.log(`RaceWEEEEK listening on http://0.0.0.0:${port}`)
})
