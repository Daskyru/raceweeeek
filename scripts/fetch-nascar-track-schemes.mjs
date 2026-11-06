/**
 * Downloads official vector track layouts from cf.nascar.com (same source as nascar.com).
 * PNG/JPG on nascar.com often return 403 to automated clients; SVG on the CDN works.
 *
 * Run: node scripts/fetch-nascar-track-schemes.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'nascar', 'tracks')
const MAP_OUT = path.join(ROOT, 'src', 'api', 'nascarTrackLocalImages.generated.json')

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://www.nascar.com/',
  Accept: 'image/svg+xml,application/json,*/*',
}

const TRACKS_URL = 'https://cf.nascar.com/cacher/tracks.json'

function vectorSvgUrl(trackId) {
  return `https://cf.nascar.com/data/images/vector-tracks/svg/${trackId}.svg`
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const res = await fetch(TRACKS_URL, { headers: HEADERS })
  if (!res.ok) throw new Error(`tracks.json ${res.status}`)
  const data = await res.json()
  const items = Array.isArray(data?.items) ? data.items : []
  const map = /** @type {Record<string, string>} */ ({})

  let ok = 0
  let skip = 0

  for (const item of items) {
    const id = item.track_id
    if (!id) continue

    const url = vectorSvgUrl(id)
    try {
      const imgRes = await fetch(url, { headers: HEADERS })
      if (!imgRes.ok) {
        console.warn(`SKIP ${id}: ${imgRes.status}`)
        skip++
        continue
      }
      const text = await imgRes.text()
      if (!text.includes('<svg') && !text.includes('<?xml')) {
        console.warn(`SKIP ${id}: not SVG`)
        skip++
        continue
      }
      const filename = `${id}.svg`
      const localPath = path.join(OUT_DIR, filename)
      await fs.writeFile(localPath, text, 'utf8')
      map[String(id)] = `/nascar/tracks/${filename}`
      ok++
      console.log(`OK ${id} -> ${filename}`)
    } catch (e) {
      console.warn(`FAIL ${id}:`, e.message)
      skip++
    }
  }

  await fs.writeFile(MAP_OUT, JSON.stringify(map, null, 2) + '\n', 'utf8')
  console.log(
    `\nDone: ${ok} SVG saved, ${skip} skipped. Map -> ${path.relative(ROOT, MAP_OUT)}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
