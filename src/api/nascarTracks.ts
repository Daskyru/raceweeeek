import { fetchNascarJson, normalizeNascarFeedArray } from './nascarClient'

export interface NascarTrackCatalogItem {
  track_id: number
  track_name: string
  track_image?: string
  track_image_thumbnail?: string
  city?: string
  state?: string
}

interface TracksJsonRoot {
  items?: NascarTrackCatalogItem[]
}

let catalogPromise: Promise<Map<number, NascarTrackCatalogItem>> | null = null

async function loadTrackCatalog(): Promise<Map<number, NascarTrackCatalogItem>> {
  const raw = await fetchNascarJson<TracksJsonRoot | NascarTrackCatalogItem[]>(
    '/cacher/tracks.json',
  )
  const items =
    raw && typeof raw === 'object' && 'items' in raw && Array.isArray(raw.items)
      ? raw.items
      : normalizeNascarFeedArray<NascarTrackCatalogItem>(raw)
  const map = new Map<number, NascarTrackCatalogItem>()
  for (const t of items) {
    if (t?.track_id > 0) map.set(t.track_id, t)
  }
  return map
}

export function getNascarTrackCatalog(): Promise<Map<number, NascarTrackCatalogItem>> {
  if (!catalogPromise) {
    catalogPromise = loadTrackCatalog().catch((err) => {
      catalogPromise = null
      throw err
    })
  }
  return catalogPromise
}

/** Official vector layout from NASCAR CDN (via app proxy). */
export function nascarVectorTrackUrl(trackId: number): string {
  return `/api/nascar/data/images/vector-tracks/svg/${trackId}.svg`
}

export async function resolveNascarTrackSchemeUrl(
  trackId: number,
): Promise<string> {
  const vector = nascarVectorTrackUrl(trackId)
  try {
    const catalog = await getNascarTrackCatalog()
    const entry = catalog.get(trackId)
    const png = entry?.track_image?.trim()
    if (png) {
      return vector
    }
  } catch {
    /* vector only */
  }
  return vector
}

export async function nascarTrackSchemeFallbackUrl(
  trackId: number,
): Promise<string | null> {
  try {
    const catalog = await getNascarTrackCatalog()
    return catalog.get(trackId)?.track_image?.trim() ?? null
  } catch {
    return null
  }
}
