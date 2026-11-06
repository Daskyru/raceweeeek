import { GT3_RACE_POINTS } from './gt3Config'
import type { OpenWecSessionResult } from './openwecTypes'

/** Max plausible race lap (s); used to filter timed-session best laps. */
export const WEC_MAX_SORTABLE_LAP_S = 145

export function isSortableTimedLap(fl_time_s: number | null | undefined): boolean {
  return (
    fl_time_s != null &&
    Number.isFinite(fl_time_s) &&
    fl_time_s > 0 &&
    fl_time_s <= WEC_MAX_SORTABLE_LAP_S
  )
}

export function isLmgt3ClassifiedResult(status: string): boolean {
  const s = status.trim().toLowerCase()
  if (!s || /not classified|dnf|dns|dsq|disqualif|retired|did not/i.test(s)) {
    return false
  }
  return /classified/.test(s)
}

export function pointsForLmgt3ClassPosition(classPos: number): number {
  if (classPos < 1 || classPos > GT3_RACE_POINTS.length) return 0
  return GT3_RACE_POINTS[classPos - 1]
}

/** Race: classified LMGT3 finishers first (by overall position), then the rest. */
export function orderLmgt3RaceResults(
  results: OpenWecSessionResult[],
): OpenWecSessionResult[] {
  const byPos = (a: OpenWecSessionResult, b: OpenWecSessionResult) => {
    const pa = a.position ?? Number.MAX_SAFE_INTEGER
    const pb = b.position ?? Number.MAX_SAFE_INTEGER
    return pa - pb
  }
  const classified = results.filter((r) => isLmgt3ClassifiedResult(r.status)).sort(byPos)
  const other = results.filter((r) => !isLmgt3ClassifiedResult(r.status)).sort(byPos)
  return [...classified, ...other]
}

export function lmgt3ClassPositionForRaceRow(
  ordered: OpenWecSessionResult[],
  row: OpenWecSessionResult,
): number {
  const classifiedBefore = ordered.filter(
    (r) =>
      isLmgt3ClassifiedResult(r.status) &&
      (r.position ?? Number.MAX_SAFE_INTEGER) <
        (row.position ?? Number.MAX_SAFE_INTEGER),
  ).length
  if (isLmgt3ClassifiedResult(row.status)) {
    return classifiedBefore + 1
  }
  const classifiedCount = ordered.filter((r) =>
    isLmgt3ClassifiedResult(r.status),
  ).length
  const amongNonClassified = ordered
    .filter((r) => !isLmgt3ClassifiedResult(r.status))
    .sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) -
        (b.position ?? Number.MAX_SAFE_INTEGER),
    )
  const idx = amongNonClassified.findIndex((r) => r.car_number === row.car_number)
  return classifiedCount + (idx >= 0 ? idx + 1 : ordered.indexOf(row) + 1)
}

export function formatGt3TeamEntryLabel(r: OpenWecSessionResult): string {
  const num = r.car_number.trim()
  const team = r.team.trim()
  return num ? `#${num} ${team}` : team
}

export interface WecStandingsAgg {
  points: number
  /** placeCounts[i] = number of (i+1)-th place class finishes in scored races. */
  placeCounts: number[]
  /** Best class finish (1 = best); higher means worse. */
  bestClassFinish: number
}

export function initWecStandingsAgg(): WecStandingsAgg {
  return {
    points: 0,
    placeCounts: Array(GT3_RACE_POINTS.length).fill(0),
    bestClassFinish: Number.POSITIVE_INFINITY,
  }
}

export function applyWecRacePoints(
  agg: WecStandingsAgg,
  classPos: number,
  pts: number,
): void {
  if (pts <= 0) return
  agg.points += pts
  if (classPos >= 1 && classPos <= agg.placeCounts.length) {
    agg.placeCounts[classPos - 1] += 1
  }
  if (classPos < agg.bestClassFinish) agg.bestClassFinish = classPos
}

/** Points desc, then countback (more 1st, then 2nd, …), then best single finish. */
export function compareWecStandingsAgg(a: WecStandingsAgg, b: WecStandingsAgg): number {
  if (b.points !== a.points) return b.points - a.points
  for (let i = 0; i < GT3_RACE_POINTS.length; i++) {
    const diff = (b.placeCounts[i] ?? 0) - (a.placeCounts[i] ?? 0)
    if (diff !== 0) return diff
  }
  const aBest = Number.isFinite(a.bestClassFinish) ? a.bestClassFinish : 999
  const bBest = Number.isFinite(b.bestClassFinish) ? b.bestClassFinish : 999
  return aBest - bBest
}

/** Same points → same championship position (1, 1, 3 …). */
export function assignTiedStandingsPositions<T extends { points: number }>(
  rows: T[],
): (T & { position: number })[] {
  let rank = 1
  return rows.map((row, i) => {
    if (i > 0 && row.points < rows[i - 1].points) rank = i + 1
    return { ...row, position: rank }
  })
}

/** FP / Qualifying: cars with a best lap first; ties share the same position. */
export function sortTimedSessionResults(
  results: OpenWecSessionResult[],
): OpenWecSessionResult[] {
  return [...results].sort((a, b) => {
    const aOk = isSortableTimedLap(a.fl_time_s)
    const bOk = isSortableTimedLap(b.fl_time_s)
    if (aOk !== bOk) return aOk ? -1 : 1
    if (aOk && bOk && a.fl_time_s! !== b.fl_time_s!) return a.fl_time_s! - b.fl_time_s!
    const pa = a.position ?? Number.MAX_SAFE_INTEGER
    const pb = b.position ?? Number.MAX_SAFE_INTEGER
    if (pa !== pb) return pa - pb
    const ga = a.gap_to_first_s ?? Number.MAX_SAFE_INTEGER
    const gb = b.gap_to_first_s ?? Number.MAX_SAFE_INTEGER
    if (ga !== gb) return ga - gb
    return a.car_number.localeCompare(b.car_number)
  })
}

export function timedSessionPositions(sorted: OpenWecSessionResult[]): number[] {
  const positions: number[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (!isSortableTimedLap(sorted[i].fl_time_s)) {
      positions.push(i + 1)
      continue
    }
    if (i === 0) {
      positions.push(1)
      continue
    }
    let prev = i - 1
    while (prev >= 0 && !isSortableTimedLap(sorted[prev].fl_time_s)) prev--
    if (prev < 0) {
      positions.push(1)
      continue
    }
    if (sorted[prev].fl_time_s === sorted[i].fl_time_s) {
      positions.push(positions[prev])
    } else {
      positions.push(positions[prev] + 1)
    }
  }
  return positions
}
