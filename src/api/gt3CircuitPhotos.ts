/** WEC seasonRound (OpenWEC) → static photo under /public/gt3/. */
const GT3_CIRCUIT_PHOTO_BY_ROUND: Record<number, string> = {
  1: '/gt3/imola.png',
  2: '/gt3/spa.png',
  3: '/gt3/lemans.png',
  4: '/gt3/saopaulo.png',
  5: '/gt3/america.png',
}

export function gt3CircuitPhotoUrl(seasonRound: number | undefined): string | null {
  if (seasonRound == null) return null
  return GT3_CIRCUIT_PHOTO_BY_ROUND[seasonRound] ?? null
}
