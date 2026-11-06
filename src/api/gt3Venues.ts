/** WEC venue labels (OpenWEC has no country field). Keys: normalized name / raw_id suffix. */
export interface Gt3VenueLabels {
  country: string
  circuit: string
}

const VENUES: Record<string, Gt3VenueLabels> = {
  LOSAIL: { country: 'Qatar', circuit: 'Losail International Circuit' },
  IMOLA: { country: 'Italy', circuit: 'Imola' },
  'SPA FRANCORCHAMPS': { country: 'Belgium', circuit: 'Spa-Francorchamps' },
  'LE MANS': { country: 'France', circuit: 'Circuit de la Sarthe' },
  'SAO PAULO': { country: 'Brazil', circuit: 'Interlagos' },
  'CIRCUIT OF THE AMERICAS': { country: 'United States', circuit: 'Circuit of the Americas' },
  'FUJI SPEEDWAY': { country: 'Japan', circuit: 'Fuji Speedway' },
  'BAHRAIN INTERNATIONAL CIRCUIT': {
    country: 'Bahrain',
    circuit: 'Bahrain International Circuit',
  },
}

function normalizeVenueKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function resolveGt3Venue(
  rawId: string,
  eventName: string,
): Gt3VenueLabels | null {
  const keys = new Set<string>()
  keys.add(normalizeVenueKey(eventName))
  const fromRaw = rawId.replace(/^\d+_/, '')
  keys.add(normalizeVenueKey(fromRaw))

  for (const key of keys) {
    const hit = VENUES[key]
    if (hit) return hit
  }
  return null
}
