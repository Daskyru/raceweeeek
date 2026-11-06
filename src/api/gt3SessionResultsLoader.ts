import { formatSingleLapTime } from '../utils/format'
import type { ResultRow } from './types'
import type { OpenWecLap, OpenWecSessionResult } from './openwecTypes'
import { fetchSessionLaps, fetchSessionResults } from './openwecClient'
import {
  formatGt3TeamEntryLabel,
  isLmgt3ClassifiedResult,
  isSortableTimedLap,
  lmgt3ClassPositionForRaceRow,
  orderLmgt3RaceResults,
  pointsForLmgt3ClassPosition,
  sortTimedSessionResults,
  timedSessionPositions,
  WEC_MAX_SORTABLE_LAP_S,
} from './gt3Scoring'

interface CarLapStats {
  carBest_s: number | null
}

function driverNames(drivers: OpenWecSessionResult['drivers']): string {
  if (drivers.length === 0) return ''
  return drivers
    .sort((a, b) => a.slot - b.slot)
    .map((d) => `${d.first_name} ${d.last_name}`.trim())
    .filter(Boolean)
    .join(' / ')
}

/** Полная ячейка «Гонщик»: имена + `(#номер)` один раз. */
export function formatGt3DriverCell(r: OpenWecSessionResult): string {
  const names = driverNames(r.drivers)
  const num = r.car_number.trim()
  const suffix = num ? ` (#${num})` : ''
  if (names) return `${names}${suffix}`
  const fallback = r.team.trim() || r.vehicle.trim()
  if (fallback) return `${fallback}${suffix}`
  return num ? `#${num}` : '—'
}

function carNumberToInt(carNumber: string): number {
  const n = parseInt(carNumber, 10)
  return Number.isFinite(n) ? n : 0
}

function mapStatus(status: string): ResultRow['status'] {
  if (/retired|dnf|not classified/i.test(status)) return 'DNF'
  if (/dns/i.test(status)) return 'DNS'
  if (/dsq|disqualif/i.test(status)) return 'DSQ'
  return null
}

function formatRaceResultCell(r: OpenWecSessionResult): string {
  const status = mapStatus(r.status)
  if (status) return status
  if (r.gap_to_first_s != null && r.gap_to_first_s > 0) {
    return `+${formatSingleLapTime(r.gap_to_first_s)}`
  }
  if (r.total_time_s != null && r.total_time_s > 0) {
    return formatSingleLapTime(r.total_time_s)
  }
  return '—'
}

function lapCountsForStats(lap: OpenWecLap): boolean {
  if (lap.crossing_finish_in_pit) return false
  if (lap.pit_time_s != null && lap.pit_time_s > 0) return false
  if (lap.lap_time_s <= 0 || lap.lap_time_s > WEC_MAX_SORTABLE_LAP_S) return false
  return true
}

function statsFromLaps(laps: OpenWecLap[]): CarLapStats {
  let carBest_s: number | null = null
  for (const lap of laps) {
    if (!lapCountsForStats(lap)) continue
    if (carBest_s == null || lap.lap_time_s < carBest_s) {
      carBest_s = lap.lap_time_s
    }
  }
  return { carBest_s }
}

function resolveCarBestTime_s(
  row: OpenWecSessionResult,
  stats: CarLapStats | undefined,
): number | null {
  const fromApi =
    row.fl_time_s != null && row.fl_time_s > 0 ? row.fl_time_s : null
  const fromLaps = stats?.carBest_s ?? null
  if (fromApi != null && fromLaps != null) return Math.min(fromApi, fromLaps)
  return fromApi ?? fromLaps
}

function mapCarRow(
  r: OpenWecSessionResult,
  classPosition: number,
  opts: { isRace: boolean },
): ResultRow {
  const status = mapStatus(r.status)
  let bestTime = '—'
  if (opts.isRace) {
    bestTime = formatRaceResultCell(r)
  } else if (status) {
    bestTime = status
  } else if (isSortableTimedLap(r.fl_time_s)) {
    bestTime = formatSingleLapTime(r.fl_time_s)
  }

  const classified = isLmgt3ClassifiedResult(r.status)
  const sessionPoints = opts.isRace
    ? classified
      ? pointsForLmgt3ClassPosition(classPosition)
      : null
    : null

  return {
    position: classPosition,
    driverNumber: carNumberToInt(r.car_number),
    driverName: formatGt3DriverCell(r),
    teamName: formatGt3TeamEntryLabel(r),
    bestTime,
    laps: r.laps_completed ?? 0,
    status,
    sessionPoints,
  }
}

async function loadRaceDriverRoster(
  raceSessionId: number,
  carClass?: string,
): Promise<Map<string, OpenWecSessionResult['drivers']>> {
  const roster = new Map<string, OpenWecSessionResult['drivers']>()
  try {
    const raceRows = await fetchSessionResults(raceSessionId, carClass)
    for (const row of raceRows) {
      if (row.drivers.length > 0) {
        roster.set(row.car_number, row.drivers)
      }
    }
  } catch {
    /* optional enrichment */
  }
  return roster
}

async function loadLapStatsForCars(
  sessionId: number,
  carNumbers: string[],
): Promise<Map<string, CarLapStats>> {
  const statsByCar = new Map<string, CarLapStats>()
  const batchSize = 4
  for (let i = 0; i < carNumbers.length; i += batchSize) {
    const chunk = carNumbers.slice(i, i + batchSize)
    await Promise.all(
      chunk.map(async (car) => {
        try {
          const laps = await fetchSessionLaps(sessionId, car)
          statsByCar.set(car, statsFromLaps(laps))
        } catch {
          /* skip car — e.g. OpenWEC laps endpoint without API key */
        }
      }),
    )
  }
  return statsByCar
}

function enrichResults(
  raw: OpenWecSessionResult[],
  roster: Map<string, OpenWecSessionResult['drivers']>,
  lapStatsByCar: Map<string, CarLapStats>,
): OpenWecSessionResult[] {
  return raw.map((row) => {
    const drivers =
      row.drivers.length > 0
        ? row.drivers
        : (roster.get(row.car_number) ?? [])
    const stats = lapStatsByCar.get(row.car_number)
    const fl_time_s = resolveCarBestTime_s({ ...row, drivers }, stats)
    return { ...row, drivers, fl_time_s: fl_time_s ?? row.fl_time_s }
  })
}

export async function loadGt3SessionResults(
  sessionId: number,
  options?: { raceSessionId?: number; isRace?: boolean; carClass?: string },
): Promise<ResultRow[]> {
  const isRace = options?.isRace ?? false
  const raceSessionId = options?.raceSessionId
  const carClass = options?.carClass
  const raw = await fetchSessionResults(sessionId, carClass)

  const roster =
    raceSessionId != null
      ? await loadRaceDriverRoster(raceSessionId, carClass)
      : new Map<string, OpenWecSessionResult['drivers']>()

  const carNumbers = [...new Set(raw.map((r) => r.car_number))]
  const lapStatsByCar = !isRace
    ? await loadLapStatsForCars(sessionId, carNumbers)
    : new Map<string, CarLapStats>()

  const enriched = enrichResults(raw, roster, lapStatsByCar)
  const sorted = isRace
    ? orderLmgt3RaceResults(enriched)
    : sortTimedSessionResults(enriched)
  const timedPositions = isRace ? null : timedSessionPositions(sorted)

  return sorted.map((r, i) => {
    const classPos = isRace
      ? lmgt3ClassPositionForRaceRow(sorted, r)
      : (timedPositions![i] ?? i + 1)
    return mapCarRow(r, classPos, { isRace })
  })
}
