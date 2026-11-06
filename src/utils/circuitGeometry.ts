export const SECTOR_COLORS = ['#A5E7FF', '#7ec8e8', '#5a9fb8'] as const
export const PIT_LANE_COLOR = '#5a9fb8'
export const SM_ZONE_COLOR = '#A5E7FF'
export const TRACK_BASE_COLOR = '#A5E7FF'
const STRAIGHT_DIST = 1800
const PIT_OFFSET = 720

export function flipY(y: number): number {
  return -y
}

/** Mirror track horizontally (left ↔ right) around the polyline centroid. */
export function mirrorXCoords(x: number[]): number[] {
  const cx = x.reduce((a, b) => a + b, 0) / x.length
  return x.map((xi) => 2 * cx - xi)
}

export function computeViewBox(
  x: number[],
  y: number[],
  strokePadding: number,
  labelPadding: number,
): string {
  const xs = x
  const ys = y.map(flipY)
  const pad = strokePadding + labelPadding
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
}

/** Place label just outside the track ribbon (SVG units). */
export function labelOffsetOutsideTrack(
  x: number[],
  y: number[],
  index: number,
  trackStrokeWidth: number,
  extraGap: number,
  px?: number,
  py?: number,
): { x: number; y: number } {
  const dist = trackStrokeWidth / 2 + extraGap
  return outwardOffset(x, y, index, dist, px, py)
}

export function pointsToPath(
  x: number[],
  y: number[],
  start: number,
  end: number,
  flip = true,
): string {
  const pts: string[] = []
  for (let i = start; i <= end; i++) {
    const py = flip ? flipY(y[i]) : y[i]
    pts.push(`${x[i]},${py}`)
  }
  return pts.length >= 2 ? `M ${pts.join(' L ')}` : ''
}

export function getSectorSplitIndices(
  length: number,
  miniSectorsIndexes: number[],
): [number, number, number, number] {
  const bounds = miniSectorsIndexes?.length
    ? miniSectorsIndexes
    : [Math.floor(length / 3), Math.floor((2 * length) / 3)]

  return [
    0,
    bounds[Math.floor(bounds.length / 3)] ?? Math.floor(length / 3),
    bounds[Math.floor((2 * bounds.length) / 3)] ?? Math.floor((2 * length) / 3),
    length - 1,
  ]
}

export function buildSectorPaths(
  x: number[],
  y: number[],
  miniSectorsIndexes: number[],
): { d: string; sector: number; color: string }[] {
  const split = getSectorSplitIndices(x.length, miniSectorsIndexes)
  return [1, 2, 3].map((sector, idx) => ({
    sector,
    color: SECTOR_COLORS[idx],
    d: pointsToPath(x, y, split[idx], split[idx + 1]),
  }))
}

function centroid(x: number[], y: number[]): { cx: number; cy: number } {
  const cx = x.reduce((a, b) => a + b, 0) / x.length
  const cy = y.reduce((a, b) => a + b, 0) / y.length
  return { cx, cy: flipY(cy) }
}

/** Outward offset in SVG coordinates (y already flipped for output). */
export function outwardOffset(
  x: number[],
  y: number[],
  index: number,
  distance: number,
  px?: number,
  py?: number,
): { x: number; y: number } {
  const xi = px ?? x[index]
  const yi = py ?? flipY(y[index])
  const { cx, cy } = centroid(x, y)

  const prev = Math.max(0, index - 1)
  const next = Math.min(x.length - 1, index + 1)
  const tx = x[next] - x[prev]
  const ty = flipY(y[next]) - flipY(y[prev])
  let nx = -ty
  let ny = tx
  const nLen = Math.hypot(nx, ny) || 1
  nx /= nLen
  ny /= nLen

  const vx = xi - cx
  const vy = yi - cy
  const dot = vx * nx + vy * ny
  const sign = dot > 0 ? 1 : -1

  return {
    x: xi + sign * nx * distance,
    y: yi + sign * ny * distance,
  }
}

export function buildSmZoneSegments(
  x: number[],
  y: number[],
): { d: string; mid: { x: number; y: number }; labelPos: { x: number; y: number } }[] {
  const zones: { d: string; mid: { x: number; y: number }; labelPos: { x: number; y: number } }[] =
    []

  for (let i = 0; i < x.length - 1; i++) {
    const dist = Math.hypot(x[i + 1] - x[i], y[i + 1] - y[i])
    if (dist < STRAIGHT_DIST) continue

    const d = pointsToPath(x, y, i, i + 1)
    const midIdx = i
    const mid = {
      x: (x[i] + x[i + 1]) / 2,
      y: flipY((y[i] + y[i + 1]) / 2),
    }
    const labelPos = outwardOffset(x, y, midIdx, 900, mid.x, mid.y)
    zones.push({ d, mid, labelPos })
  }

  return zones.slice(0, 2)
}

export function buildPitLanePath(x: number[], y: number[]): string | null {
  if (x.length < 20) return null

  let bestStart = 0
  let bestLen = 0
  let runStart = 0
  let runLen = 0

  for (let i = 0; i < x.length - 1; i++) {
    const dist = Math.hypot(x[i + 1] - x[i], y[i + 1] - y[i])
    if (dist >= STRAIGHT_DIST * 0.65) {
      if (runLen === 0) runStart = i
      runLen += dist
    } else if (runLen > bestLen) {
      bestLen = runLen
      bestStart = runStart
      runLen = 0
    } else {
      runLen = 0
    }
  }
  if (runLen > bestLen) {
    bestLen = runLen
    bestStart = runStart
  }

  let end = bestStart
  let acc = 0
  while (end < x.length - 1 && acc < bestLen * 0.85) {
    acc += Math.hypot(x[end + 1] - x[end], y[end + 1] - y[end])
    end++
  }

  if (end <= bestStart) return null

  const { cx, cy } = centroid(x, y)
  const pts: string[] = []
  for (let i = bestStart; i <= end; i++) {
    const prev = Math.max(bestStart, i - 1)
    const next = Math.min(end, i + 1)
    const tx = x[next] - x[prev]
    const ty = flipY(y[next]) - flipY(y[prev])
    let nx = -ty
    let ny = tx
    const nLen = Math.hypot(nx, ny) || 1
    nx /= nLen
    ny /= nLen
    const xi = x[i]
    const yi = flipY(y[i])
    const vx = xi - cx
    const vy = yi - cy
    const sign = vx * nx + vy * ny > 0 ? 1 : -1
    pts.push(`${xi + sign * nx * PIT_OFFSET},${yi + sign * ny * PIT_OFFSET}`)
  }

  return pts.length >= 2 ? `M ${pts.join(' L ')}` : null
}
