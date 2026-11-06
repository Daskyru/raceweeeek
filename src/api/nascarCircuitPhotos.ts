import localByTrackId from './nascarTrackLocalImages.generated.json'
import marhByTrackId from './nascarTrackMarhImages.json'
import { nascarVectorTrackUrl } from './nascarTracks'

const LOCAL = localByTrackId as Record<string, string>
const MARH = marhByTrackId as Record<string, string>

/**
 * 1) User photos in `public/nascar/tracks/marh/` (see `nascarTrackMarhImages.json`, source folder `marh/`).
 * 2) Auto-downloaded SVG from `nascarTrackLocalImages.generated.json`.
 * 3) Proxy vector SVG on cf.nascar.com.
 */
export function nascarCircuitPhotoUrl(trackId?: number, _trackName?: string): string | null {
  if (trackId == null || trackId <= 0) return null
  const marh = MARH[String(trackId)]
  if (marh) return marh
  const bundled = LOCAL[String(trackId)]
  if (bundled) return bundled
  return nascarVectorTrackUrl(trackId)
}
