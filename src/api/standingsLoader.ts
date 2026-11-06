import {
  applyDriverStandingsOverrides,
  hasPlaceholderDriverNames,
  type DriverStandingRow,
} from '../utils/driverStandingsOverrides'
import type { ChampionshipDriver, ChampionshipTeam, Driver, Session } from './types'
import {
  fetchChampionshipDrivers,
  fetchChampionshipTeams,
  fetchDrivers,
  fetchRaceSessions,
  fetchSessions,
  findLastCompletedRaceSession,
} from './openf1Client'

async function fetchSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadDriversForRace(race: Session): Promise<Driver[]> {
  const tryFetch = () => fetchSafe(() => fetchDrivers(race.session_key), [] as Driver[])

  let drivers = await tryFetch()
  if (drivers.length > 0) return drivers

  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(350)
    drivers = await tryFetch()
    if (drivers.length > 0) return drivers
  }

  const sessions = await fetchSafe(
    () => fetchSessions(race.meeting_key),
    [] as Session[],
  )
  const fallbackSessions = sessions
    .filter((s) => s.session_key !== race.session_key && !s.is_cancelled)
    .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime())

  for (const session of fallbackSessions) {
    drivers = await fetchSafe(() => fetchDrivers(session.session_key), [] as Driver[])
    if (drivers.length > 0) return drivers
  }

  return []
}

async function loadTeamsForRace(sessionKey: number): Promise<ChampionshipTeam[]> {
  const tryFetch = () =>
    fetchSafe(() => fetchChampionshipTeams(sessionKey), [] as ChampionshipTeam[])

  let teams = await tryFetch()
  if (teams.length > 0) return teams

  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(350)
    teams = await tryFetch()
    if (teams.length > 0) return teams
  }

  return []
}

function completedRacesDesc(sessions: Session[]): Session[] {
  const now = Date.now()
  return sessions
    .filter((s) => s.session_name === 'Race' && !s.is_cancelled)
    .filter((s) => new Date(s.date_end).getTime() < now)
    .sort((a, b) => new Date(b.date_end).getTime() - new Date(a.date_end).getTime())
}

function normalizePoints(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return 0
}

function buildDriverRows(
  driversChamp: ChampionshipDriver[],
  driverMap: Map<number, Driver>,
): DriverStandingRow[] {
  return [...driversChamp]
    .sort((a, b) => a.position_current - b.position_current)
    .map((row) => ({
      position: row.position_current,
      driverNumber: row.driver_number,
      name: driverMap.get(row.driver_number)?.full_name ?? `#${row.driver_number}`,
      team: driverMap.get(row.driver_number)?.team_name ?? '—',
      points: normalizePoints(row.points_current),
    }))
}

function buildTeamsRows(teamsChamp: ChampionshipTeam[]) {
  return [...teamsChamp]
    .sort((a, b) => a.position_current - b.position_current)
    .map((row) => ({
      position: row.position_current,
      name: row.team_name,
      points: normalizePoints(row.points_current),
    }))
}

async function loadForSeason(season: number) {
  const raceSessions = await fetchRaceSessions(season)
  const completed = completedRacesDesc(raceSessions)
  const lastRace = findLastCompletedRaceSession(raceSessions)

  if (completed.length === 0 && !lastRace) {
    return { drivers: [], teams: [], raceSessionKey: null as number | null }
  }

  for (const race of completed) {
    const [driversChamp, drivers] = await Promise.all([
      fetchSafe(() => fetchChampionshipDrivers(race.session_key), [] as ChampionshipDriver[]),
      loadDriversForRace(race),
    ])
    let teamsChamp = await loadTeamsForRace(race.session_key)

    if (driversChamp.length === 0 && teamsChamp.length === 0) continue

    let driversRows: DriverStandingRow[] = []
    if (driversChamp.length > 0) {
      const driverMap = new Map(drivers.map((d) => [d.driver_number, d]))
      driversRows = applyDriverStandingsOverrides(buildDriverRows(driversChamp, driverMap))

      if (hasPlaceholderDriverNames(driversRows)) {
        await sleep(400)
        const retryDrivers = await loadDriversForRace(race)
        if (retryDrivers.length > 0) {
          const retryMap = new Map(retryDrivers.map((d) => [d.driver_number, d]))
          driversRows = applyDriverStandingsOverrides(buildDriverRows(driversChamp, retryMap))
        }
      }
    }

    let teamsRows = buildTeamsRows(teamsChamp)
    if (teamsRows.length === 0 && (driversChamp.length > 0 || driversRows.length > 0)) {
      await sleep(400)
      teamsChamp = await loadTeamsForRace(race.session_key)
      teamsRows = buildTeamsRows(teamsChamp)
    }

    if (driversRows.length === 0 && teamsRows.length === 0) continue

    if (driversRows.length > 0) {
      return {
        drivers: driversRows,
        teams: teamsRows,
        raceSessionKey: race.session_key,
      }
    }
  }

  return { drivers: [], teams: [], raceSessionKey: lastRace?.session_key ?? null }
}

export function hasEmptyTeamStandings(
  drivers: DriverStandingRow[],
  teams: { position: number; name: string; points: number }[],
): boolean {
  return drivers.length > 0 && teams.length === 0
}

export async function loadChampionshipStandings(season: number) {
  const current = await loadForSeason(season)
  if (current.drivers.length > 0 && current.teams.length > 0) return current
  if (current.drivers.length > 0 || current.teams.length > 0) return current
  if (season > 2023) {
    const prev = await loadForSeason(season - 1)
    if (prev.drivers.length > 0 || prev.teams.length > 0) return prev
  }
  return current
}
