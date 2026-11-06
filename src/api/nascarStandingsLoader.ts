import type { DriverStandingRow } from '../utils/driverStandingsOverrides'
import {
  fetchPointsFeed,
  fetchRaceListBasic,
  fetchWeekendFeed,
  mapPool,
} from './nascarClient'
import { cupRacesFromList, isCupRaceCompleted } from './nascarMappers'
import type { NascarPointsFeedRow, NascarRaceListItem } from './nascarTypes'

export interface NascarStandings {
  drivers: DriverStandingRow[]
  teams: Array<{ position: number; name: string; points: number }>
  /** True when `points-feed.json` was used. */
  fromOfficialFeed: boolean
}

function carNumberToInt(carNumber: string | undefined): number {
  if (!carNumber) return 0
  const n = parseInt(carNumber.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function pointsPayingCupRaces(races: NascarRaceListItem[]): NascarRaceListItem[] {
  return cupRacesFromList(races).filter(
    (r) => r.race_type_id === 1 && isCupRaceCompleted(r),
  )
}

interface DriverMeta {
  team: string
  ownerId: number
  ownerName: string
}

async function loadDriverMetaMap(
  year: number,
  races: NascarRaceListItem[],
): Promise<Map<number, DriverMeta>> {
  const meta = new Map<number, DriverMeta>()
  const recentRaceIds = races
    .slice(-3)
    .map((r) => r.race_id)
    .reverse()

  await mapPool(recentRaceIds, 3, async (raceId) => {
    try {
      const feed = await fetchWeekendFeed(year, raceId)
      const results = feed.weekend_race?.[0]?.results ?? []
      for (const row of results) {
        if (row.driver_id <= 0) continue
        meta.set(row.driver_id, {
          team: row.team_name?.trim() || row.owner_fullname?.trim() || '—',
          ownerId: row.owner_id,
          ownerName: row.owner_fullname?.trim() || row.team_name?.trim() || '—',
        })
      }
    } catch {
      /* skip */
    }
  })

  return meta
}

function standingsFromPointsFeed(
  rows: NascarPointsFeedRow[],
  meta: Map<number, DriverMeta>,
): NascarStandings {
  const sorted = [...rows].sort((a, b) => a.position - b.position)

  const drivers: DriverStandingRow[] = sorted.map((row) => {
    const m = meta.get(row.driver_id)
    return {
      position: row.position,
      driverNumber: carNumberToInt(row.car_no),
      name: row.driver_name.trim(),
      team: m?.team ?? row.manufacturer ?? '—',
      points: row.points,
    }
  })

  type OwnerAgg = { ownerId: number; name: string; points: number }
  const owners = new Map<number, OwnerAgg>()

  for (const row of sorted) {
    const m = meta.get(row.driver_id)
    if (!m || m.ownerId <= 0) continue
    const existing = owners.get(m.ownerId) ?? {
      ownerId: m.ownerId,
      name: m.ownerName,
      points: 0,
    }
    existing.points += row.points
    existing.name = m.ownerName
    owners.set(m.ownerId, existing)
  }

  const teams = [...owners.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((o, i) => ({
      position: i + 1,
      name: o.name,
      points: o.points,
    }))

  return { drivers, teams, fromOfficialFeed: true }
}

async function aggregateStandingsFallback(
  year: number,
  races: NascarRaceListItem[],
): Promise<NascarStandings> {
  type DriverAgg = {
    driverId: number
    name: string
    team: string
    carNumber: string
    points: number
  }
  type OwnerAgg = { ownerId: number; name: string; points: number }

  const drivers = new Map<number, DriverAgg>()
  const owners = new Map<number, OwnerAgg>()
  const raceIds = races.map((r) => r.race_id)

  await mapPool(raceIds, 6, async (raceId) => {
    try {
      const feed = await fetchWeekendFeed(year, raceId)
      const race = feed.weekend_race?.[0]
      if (!race?.results?.length) return
      for (const row of race.results) {
        const pts = row.points_earned ?? 0
        if (pts <= 0) continue
        const d = drivers.get(row.driver_id) ?? {
          driverId: row.driver_id,
          name: row.driver_fullname,
          team: row.team_name,
          carNumber: row.car_number,
          points: 0,
        }
        d.points += pts
        d.name = row.driver_fullname
        d.team = row.team_name
        d.carNumber = row.car_number
        drivers.set(row.driver_id, d)

        if (row.owner_id > 0) {
          const o = owners.get(row.owner_id) ?? {
            ownerId: row.owner_id,
            name: row.owner_fullname || row.team_name,
            points: 0,
          }
          o.points += pts
          o.name = row.owner_fullname || row.team_name
          owners.set(row.owner_id, o)
        }
      }
    } catch {
      /* skip race */
    }
  })

  const driverRows = [...drivers.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((d, i) => ({
      position: i + 1,
      driverNumber: carNumberToInt(d.carNumber),
      name: d.name,
      team: d.team,
      points: d.points,
    }))

  const teamRows = [...owners.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((t, i) => ({
      position: i + 1,
      name: t.name,
      points: t.points,
    }))

  return { drivers: driverRows, teams: teamRows, fromOfficialFeed: false }
}

export async function loadNascarStandings(year: number): Promise<NascarStandings> {
  const list = await fetchRaceListBasic(year)
  const pointsRaces = pointsPayingCupRaces(list.series_1)

  try {
    const feedRows = await fetchPointsFeed(year)
    if (feedRows.length > 0) {
      const meta = await loadDriverMetaMap(year, pointsRaces)
      return standingsFromPointsFeed(feedRows, meta)
    }
  } catch {
    /* fallback below */
  }

  if (pointsRaces.length === 0) {
    return { drivers: [], teams: [], fromOfficialFeed: false }
  }
  return aggregateStandingsFallback(year, pointsRaces)
}
