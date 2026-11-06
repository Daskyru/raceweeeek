import { formatSingleLapTime } from '../utils/format'
import { nascarKindFromSessionKey, NASCAR_SESSION_KIND } from './nascarConfig'
import { fetchWeekendFeed } from './nascarClient'
import type {
  NascarRaceResultRow,
  NascarWeekendRun,
  NascarWeekendRunResult,
} from './nascarTypes'
import type { ResultRow } from './types'

function carNumberToInt(carNumber: string): number {
  const n = parseInt(carNumber, 10)
  return Number.isFinite(n) ? n : 0
}

/** Race gaps from NASCAR feeds are in milliseconds. */
function gapSecondsFromFeed(value: number | undefined | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value / 1000
}

function formatSpeedMph(speed: number): string {
  return `${speed.toFixed(3)} mph`
}

function formatRunBestTime(r: NascarWeekendRunResult): string {
  if (r.best_lap_time != null && r.best_lap_time > 0) {
    return formatSingleLapTime(r.best_lap_time)
  }
  if (r.best_lap_speed != null && r.best_lap_speed > 0) {
    return formatSpeedMph(r.best_lap_speed)
  }
  return '—'
}

function sortRunResults(results: NascarWeekendRunResult[]): NascarWeekendRunResult[] {
  const classified = results.filter(
    (r) => r.finishing_position > 0 && !r.disqualified,
  )
  return [...classified].sort((a, b) => {
    const posA = a.finishing_position
    const posB = b.finishing_position
    if (posA !== posB) return posA - posB
    const tA = a.best_lap_time ?? Number.POSITIVE_INFINITY
    const tB = b.best_lap_time ?? Number.POSITIVE_INFINITY
    if (tA !== tB) return tA - tB
    const spdA = a.best_lap_speed ?? 0
    const spdB = b.best_lap_speed ?? 0
    return spdB - spdA
  })
}

function mapRunResults(run: NascarWeekendRun): ResultRow[] {
  return sortRunResults(run.results).map((r, idx) => ({
    position: r.finishing_position > 0 ? r.finishing_position : idx + 1,
    driverNumber: carNumberToInt(r.car_number),
    driverName: r.driver_name.trim(),
    teamName: (r.manufacturer ?? '').trim() || '—',
    bestTime: formatRunBestTime(r),
    laps: r.laps_completed ?? 0,
    status: r.disqualified ? 'DSQ' : null,
  }))
}

function mapRaceStatus(row: NascarRaceResultRow): ResultRow['status'] {
  if (row.disqualified) return 'DSQ'
  if (row.finishing_position <= 0) return 'DNS'
  const st = (row.finishing_status ?? '').trim().toLowerCase()
  if (!st || st === 'running') return null
  if (st.includes('dns')) return 'DNS'
  if (st.includes('dsq') || st.includes('disqualif')) return 'DSQ'
  return 'DNF'
}

function formatRaceResult(
  row: NascarRaceResultRow,
  winnerTotalRaceTime?: string | null,
): string {
  const status = mapRaceStatus(row)
  if (status) return status
  if (row.finishing_position === 1) {
    const wall = winnerTotalRaceTime?.trim()
    if (wall) return `Leader · ${wall}`
    return 'Leader'
  }
  const lapsDown = row.diff_laps ?? 0
  if (lapsDown > 0) {
    return `+${lapsDown} ${lapsDown === 1 ? 'lap' : 'laps'}`
  }
  const gapS = gapSecondsFromFeed(row.diff_time)
  if (gapS != null) {
    return `+${formatSingleLapTime(gapS)}`
  }
  return '—'
}

function mapRaceResults(
  results: NascarRaceResultRow[],
  winnerTotalRaceTime?: string | null,
): ResultRow[] {
  const sorted = [...results]
    .filter((r) => r.finishing_position > 0)
    .sort((a, b) => a.finishing_position - b.finishing_position)

  return sorted.map((r) => ({
    position: r.finishing_position,
    driverNumber: carNumberToInt(r.car_number),
    driverName: r.driver_fullname.trim(),
    teamName: r.team_name?.trim() || '—',
    bestTime: formatRaceResult(r, winnerTotalRaceTime),
    laps: r.laps_completed ?? 0,
    status: mapRaceStatus(r),
    sessionPoints:
      r.points_earned != null && r.points_earned > 0 ? r.points_earned : null,
  }))
}

function practiceRuns(runs: NascarWeekendRun[]): NascarWeekendRun[] {
  return runs
    .filter((r) => r.run_type === 1)
    .sort(
      (a, b) =>
        new Date(a.run_date_utc).getTime() - new Date(b.run_date_utc).getTime(),
    )
}

function qualifyingRun(runs: NascarWeekendRun[]): NascarWeekendRun | undefined {
  const qual = runs
    .filter((r) => r.run_type === 2)
    .sort(
      (a, b) =>
        new Date(b.run_date_utc).getTime() - new Date(a.run_date_utc).getTime(),
    )
  return qual[0]
}

export async function loadNascarSessionResults(
  year: number,
  raceId: number,
  sessionKey: number,
): Promise<ResultRow[]> {
  const kind = nascarKindFromSessionKey(sessionKey)
  const feed = await fetchWeekendFeed(year, raceId)

  if (kind === NASCAR_SESSION_KIND.race) {
    const race = feed.weekend_race?.[0]
    if (!race?.results?.length) return []
    return mapRaceResults(race.results, race.total_race_time)
  }

  const runs = feed.weekend_runs ?? []
  if (kind === NASCAR_SESSION_KIND.fp1) {
    const run = practiceRuns(runs)[0]
    return run ? mapRunResults(run) : []
  }
  if (kind === NASCAR_SESSION_KIND.fp2) {
    const run = practiceRuns(runs)[1]
    return run ? mapRunResults(run) : []
  }
  if (kind === NASCAR_SESSION_KIND.qualifying) {
    const run = qualifyingRun(runs)
    return run ? mapRunResults(run) : []
  }

  return []
}
