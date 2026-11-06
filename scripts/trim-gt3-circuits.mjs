import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gt3Dir = path.join(__dirname, '..', 'public', 'gt3')
const files = ['imola.png', 'spa.png', 'lemans.png', 'saopaulo.png', 'america.png']

function isBackground(r, g, b, a) {
  if (a < 16) return true
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max - min < 18 && max > 175) return true
  if (r > 240 && g > 240 && b > 240) return true
  return false
}

async function contentBBox(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = channels > 3 ? data[i + 3] : 255
      if (!isBackground(r, g, b, a)) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null

  const pad = Math.round(Math.min(width, height) * 0.02)
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

async function processCircuit(filename) {
  const input = path.join(gt3Dir, '_source', filename)
  const output = path.join(gt3Dir, filename)
  const meta = await sharp(input).metadata()
  const bbox = await contentBBox(input)

  let pipeline = sharp(input)
  if (bbox) {
    pipeline = pipeline.extract(bbox)
  } else {
    pipeline = pipeline.trim({ threshold: 24 })
  }

  const trimmed = await pipeline.png({ compressionLevel: 9 }).toBuffer()
  const outMeta = await sharp(trimmed).metadata()

  let final = sharp(trimmed)
  if (outMeta.width > 2000 || outMeta.height > 2000) {
    final = final.resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  await final.png({ compressionLevel: 9 }).toFile(output)

  return {
    file: filename,
    before: `${meta.width}×${meta.height}`,
    after: `${outMeta.width}×${outMeta.height}`,
  }
}

const results = []
for (const f of files) {
  results.push(await processCircuit(f))
}
console.log(JSON.stringify(results, null, 2))
