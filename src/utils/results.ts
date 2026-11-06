import type { Driver, Lap, ResultRow, SessionResult } from '../api/types'
import { formatLapTime, formatQualifyingSegmentTimes, formatSingleLapTime } from './format'
import { sessionResultStatusOverride } from './sessionResultStatusOverrides'

export type ResultStatus = 'DNF' | 'DNS' | 'DSQ' | null

const RACE_LIKE_SESSIONS = new Set(['Race', 'Sprint'])
const QUALIFYING_SESSIONS = new Set(['Qualifying', 'Sprint Qualifying'])

function isQualifyingSession(sessionName: string | undefined): boolean {
  return sessionName != null && QUALIFYING_SESSIONS.has(sessionName)
}

const GAP_LAP_PATTERN = /^\+\s*\d+\s*LAPS?$/i
const GAP_RETIRE_PATTERN = /\b(DNF|RET(?:IRED)?|NC|NOT CLASSIFIED)\b/i

function isRaceLikeSession(sessionName: string | undefined): boolean {
  return sessionName != null && RACE_LIKE_SESSIONS.has(sessionName)
}

function isPracticeSession(sessionName: string | undefined): boolean {
  return sessionName != null && sessionName.startsWith('Practice')
}

function sortableGridPosition(position: number): number {
  if (position <= 0 || position >= 999) return Number.MAX_SAFE_INTEGER
  return position
}

export function renumberGridResultRows(rows: ResultRow[]): ResultRow[] {
  const sorted = [...rows].sort((a, b) => {
    const pa = sortableGridPosition(a.position)
    const pb = sortableGridPosition(b.position)
    if (pa !== pb) return pa - pb
    return a.driverNumber - b.driverNumber
  })
  return sorted.map((row, index) => ({ ...row, position: index + 1 }))
}

export function leaderLapsFromResults(results: SessionResult[]): number {
  if (results.length === 0) return 0
  const fromLeader = results.find((r) => r.position === 1)?.number_of_laps
  if (fromLeader != null && fromLeader > 0) return fromLeader
  return Math.max(...results.map((r) => r.number_of_laps ?? 0))
}

function gapToLeaderImpliesRetirement(gap: string): boolean {
  const trimmed = gap.trim()
  if (GAP_LAP_PATTERN.test(trimmed)) return false
  return GAP_RETIRE_PATTERN.test(trimmed)
}

function gapStringsFromResult(r: SessionResult): string[] {
  const gap = r.gap_to_leader
  if (gap == null) return []
  if (typeof gap === 'string') return [gap]
  if (typeof gap === 'number') return []
  if (Array.isArray(gap)) {
    return gap.filter((g): g is string => typeof g === 'string')
  }
  return []
}

export function resolveResultStatus(
  r: SessionResult,
  options?: { sessionName?: string; leaderLaps?: number },
): ResultStatus {
  if (r.dsq) return 'DSQ'
  if (r.dns) return 'DNS'
  if (r.dnf) return 'DNF'

  const override = sessionResultStatusOverride(r.session_key, r.driver_number)
  if (override) return override

  const sessionName = options?.sessionName

  if (isQualifyingSession(sessionName)) {
    for (const gap of gapStringsFromResult(r)) {
      if (gapToLeaderImpliesRetirement(gap)) return 'DNF'
    }
    if (r.position == null || r.position <= 0) {
      return 'DNF'
    }
    return null
  }

  if (isPracticeSession(sessionName)) {
    for (const gap of gapStringsFromResult(r)) {
      if (gapToLeaderImpliesRetirement(gap)) return 'DNF'
    }
    return null
  }

  if (!isRaceLikeSession(sessionName)) return null

  for (const gap of gapStringsFromResult(r)) {
    if (gapToLeaderImpliesRetirement(gap)) return 'DNF'
  }

  const leaderLaps = options?.leaderLaps ?? 0
  if (
    leaderLaps > 0 &&
    r.number_of_laps > 0 &&
    r.number_of_laps < leaderLaps &&
    (r.position == null || r.position <= 0)
  ) {
    return 'DNF'
  }

  if (r.position == null || r.position <= 0) {
    return 'DNF'
  }

  return null
}

function formatResultTime(r: SessionResult, sessionName?: string, leaderLaps?: number): string {
  const status = resolveResultStatus(r, { sessionName, leaderLaps })
  if (status) return status
  return formatLapTime(r.duration)
}

function bestLapSecondsForDriver(driverNumber: number, laps: Lap[]): number | null {
  let best: number | null = null
  for (const lap of laps) {
    if (lap.driver_number !== driverNumber) continue
    if (lap.is_pit_out_lap || lap.lap_duration == null || lap.lap_duration <= 0) continue
    if (best == null || lap.lap_duration < best) best = lap.lap_duration
  }
  return best
}

function bestTimeFromLapsOrDuration(
  r: SessionResult,
  laps: Lap[],
  sessionName?: string,
  leaderLaps?: number,
): string {
  const fromDuration = formatResultTime(r, sessionName, leaderLaps)
  if (fromDuration !== '—') return fromDuration
  const seconds = bestLapSecondsForDriver(r.driver_number, laps)
  if (seconds != null) return formatLapTime(seconds)
  return '—'
}

function bestTimeForSessionResult(
  r: SessionResult,
  laps: Lap[],
  raceBestLap: boolean,
  sessionName?: string,
  leaderLaps?: number,
): string {
  const status = resolveResultStatus(r, { sessionName, leaderLaps })
  if (status) return status
  if (raceBestLap) {
    const seconds = bestLapSecondsForDriver(r.driver_number, laps)
    if (seconds != null) return formatLapTime(seconds)
    return formatLapTime(r.duration)
  }
  return bestTimeFromLapsOrDuration(r, laps, sessionName, leaderLaps)
}

function rowMissingSessionTime(row: ResultRow, qualifying: boolean): boolean {
  if (row.status != null) return false
  if (qualifying) {
    const q1 = row.q1 ?? '—'
    const q2 = row.q2 ?? '—'
    const q3 = row.q3 ?? '—'
    if (q1 !== '—' || q2 !== '—' || q3 !== '—') return false
    return row.bestTime === '—'
  }
  return row.bestTime === '—'
}

export function hasIncompleteSessionTimes(
  rows: ResultRow[] | undefined,
  sessionName?: string,
): boolean {
  if (!rows || rows.length === 0) return true
  const qualifying =
    sessionName === 'Qualifying' || sessionName === 'Sprint Qualifying'
  const missing = rows.filter((r) => rowMissingSessionTime(r, qualifying)).length
  if (rows.length < 10) return missing > 0
  return missing / rows.length > 0.3
}

function bestLapSecondsByQualifyingPhase(
  driverNumber: number,
  laps: Lap[],
): (number | null)[] {
  const best: (number | null)[] = [null, null, null]
  for (const lap of laps) {
    if (lap.driver_number !== driverNumber) continue
    if (lap.is_pit_out_lap || lap.lap_duration == null || lap.lap_duration <= 0) continue
    const phase = lap.qualifying_phase
    if (phase !== 1 && phase !== 2 && phase !== 3) continue
    const idx = phase - 1
    const cur = best[idx]
    if (cur == null || lap.lap_duration < cur) best[idx] = lap.lap_duration
  }
  return best
}

function qualifyingTimesFromLaps(
  driverNumber: number,
  laps: Lap[],
  status: ResultStatus,
  duration?: number | number[] | null,
): Pick<ResultRow, 'q1' | 'q2' | 'q3'> {
  if (status) {
    return { q1: status, q2: status, q3: status }
  }

  let times = formatQualifyingSegmentTimes(duration ?? null)
  const fromLaps = bestLapSecondsByQualifyingPhase(driverNumber, laps)
  const mergeFromLaps = (key: 'q1' | 'q2' | 'q3', idx: number) => {
    if (times[key] !== '—') return
    const sec = fromLaps[idx]
    if (sec != null) times = { ...times, [key]: formatSingleLapTime(sec) }
  }
  mergeFromLaps('q1', 0)
  mergeFromLaps('q2', 1)
  mergeFromLaps('q3', 2)

  return times
}

function qualifyingTimesForResult(
  r: SessionResult,
  laps: Lap[],
  status: ResultStatus,
): Pick<ResultRow, 'q1' | 'q2' | 'q3'> {
  return qualifyingTimesFromLaps(r.driver_number, laps, status, r.duration)
}

function lapsForDriver(driverNumber: number, laps: Lap[], fromResult?: number): number {
  if (fromResult != null && fromResult > 0) return fromResult
  const driverLaps = laps.filter((l) => l.driver_number === driverNumber)
  if (driverLaps.length === 0) return 0
  return Math.max(...driverLaps.map((l) => l.lap_number))
}

function rowFromSessionResult(
  r: SessionResult,
  driverMap: Map<number, Driver>,
  laps: Lap[],
  raceBestLap: boolean,
  sessionName?: string,
  leaderLaps?: number,
): ResultRow {
  const driver = driverMap.get(r.driver_number)
  const status = resolveResultStatus(r, { sessionName, leaderLaps })
  const qualTimes = isQualifyingSession(sessionName)
    ? qualifyingTimesForResult(r, laps, status)
    : {}
  return {
    position: r.position ?? 999,
    driverNumber: r.driver_number,
    driverName: driver?.full_name ?? `#${r.driver_number}`,
    teamName: driver?.team_name ?? '—',
    bestTime: bestTimeForSessionResult(r, laps, raceBestLap, sessionName, leaderLaps),
    ...qualTimes,
    laps: lapsForDriver(r.driver_number, laps, r.number_of_laps),
    status,
  }
}

function rowFromDriverOnly(
  d: Driver,
  laps: Lap[],
  sortRank: number,
  sessionKey?: number,
  sessionName?: string,
): ResultRow {
  const status =
    sessionKey != null ? sessionResultStatusOverride(sessionKey, d.driver_number) ?? null : null
  let bestTime = status ?? '—'
  if (status == null) {
    const seconds = bestLapSecondsForDriver(d.driver_number, laps)
    if (seconds != null) bestTime = formatLapTime(seconds)
  }
  const qualTimes = isQualifyingSession(sessionName)
    ? qualifyingTimesFromLaps(d.driver_number, laps, status)
    : {}
  return {
    position: sortRank,
    driverNumber: d.driver_number,
    driverName: d.full_name,
    teamName: d.team_name,
    bestTime: status ?? bestTime,
    ...qualTimes,
    laps: lapsForDriver(d.driver_number, laps),
    status,
  }
}

function isUnclassifiedRow(
  row: ResultRow,
  resultMap: Map<number, SessionResult> | undefined,
): boolean {
  if (row.status != null) return true
  const r = resultMap?.get(row.driverNumber)
  if (r != null && (r.position == null || r.position <= 0)) return true
  return false
}

export function sortResultRowsByClassification(
  rows: ResultRow[],
  resultMap?: Map<number, SessionResult>,
): ResultRow[] {
  const classified: ResultRow[] = []
  const unclassified: ResultRow[] = []

  for (const row of rows) {
    if (isUnclassifiedRow(row, resultMap)) unclassified.push(row)
    else classified.push(row)
  }

  classified.sort((a, b) => a.position - b.position)
  unclassified.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps
    return a.driverNumber - b.driverNumber
  })

  const ordered = [...classified, ...unclassified]
  const maxClassifiedPos =
    classified.length > 0 ? Math.max(...classified.map((r) => r.position)) : 0
  let tailIndex = 0

  return ordered.map((row) => {
    if (!isUnclassifiedRow(row, resultMap)) return row
    tailIndex += 1
    return {
      ...row,
      position: maxClassifiedPos + tailIndex,
    }
  })
}

export function pitStopsByDriver(pits: { driver_number: number }[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const stop of pits) {
    counts.set(stop.driver_number, (counts.get(stop.driver_number) ?? 0) + 1)
  }
  return counts
}

function attachPitStops(rows: ResultRow[], pitCounts: Map<number, number>): ResultRow[] {
  if (pitCounts.size === 0) return rows
  return rows.map((row) => ({
    ...row,
    pitStops: pitCounts.get(row.driverNumber) ?? 0,
  }))
}

/** Merge session results with full entry list (typically 22 drivers). */
export function buildResultRows(
  results: SessionResult[],
  drivers: Driver[],
  laps: Lap[],
  options?: {
    raceBestLap?: boolean
    sessionName?: string
    sessionKey?: number
    pitStops?: Map<number, number>
  },
): ResultRow[] {
  const raceBestLap = options?.raceBestLap ?? false
  const sessionName = options?.sessionName
  const sessionKey = options?.sessionKey ?? results[0]?.session_key
  const leaderLaps = isRaceLikeSession(sessionName) ? leaderLapsFromResults(results) : 0
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]))
  const resultMap = new Map(results.map((r) => [r.driver_number, r]))

  const finalizeRows = (rows: ResultRow[]) =>
    isRaceLikeSession(sessionName)
      ? sortResultRowsByClassification(rows, resultMap)
      : renumberGridResultRows(rows)

  if (drivers.length > 0) {
    const merged = drivers.map((d) => {
      const r = resultMap.get(d.driver_number)
      if (r) {
        return rowFromSessionResult(r, driverMap, laps, raceBestLap, sessionName, leaderLaps)
      }
      return rowFromDriverOnly(d, laps, 999, sessionKey, sessionName)
    })

    const sorted = finalizeRows(merged)
    return attachPitStops(sorted, options?.pitStops ?? new Map())
  }

  const fromResults = finalizeRows(
    [...results]
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((r) => rowFromSessionResult(r, driverMap, laps, raceBestLap, sessionName, leaderLaps)),
  )
  return attachPitStops(fromResults, options?.pitStops ?? new Map())
}

export function mergeDriversIntoLapRows(rows: ResultRow[], drivers: Driver[], laps: Lap[]): ResultRow[] {
  if (drivers.length === 0) return rows
  const byNumber = new Map(rows.map((r) => [r.driverNumber, r]))
  const merged = drivers.map((d) => {
    const existing = byNumber.get(d.driver_number)
    if (existing) return existing
    return rowFromDriverOnly(d, laps, 999)
  })
  merged.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    return a.driverNumber - b.driverNumber
  })
  return merged.map((row, i) => ({
    ...row,
    position: row.bestTime === '—' && row.status == null ? i + 1 : row.position,
  }))
}
