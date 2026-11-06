import type { Driver, Lap, SessionResult } from './types'
import {
  fetchDrivers,
  fetchLaps,
  fetchPit,
  fetchSessionResults,
} from './openf1Client'
import type { Pit } from './types'
import { buildResultRows, mergeDriversIntoLapRows, pitStopsByDriver } from '../utils/results'

async function fetchSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

function buildResultRowsFromLaps(laps: Lap[], drivers: Driver[]) {
  const driverMap = new Map(drivers.map((d) => [d.driver_number, d]))
  const byDriver = new Map<number, Lap[]>()

  for (const lap of laps) {
    if (lap.is_pit_out_lap || lap.lap_duration == null || lap.lap_duration <= 0) continue
    const list = byDriver.get(lap.driver_number) ?? []
    list.push(lap)
    byDriver.set(lap.driver_number, list)
  }

  const rows: { driverNumber: number; best: number; laps: number }[] = []
  for (const [driverNumber, driverLaps] of byDriver) {
    driverLaps.sort((a, b) => (a.lap_duration ?? Infinity) - (b.lap_duration ?? Infinity))
    const best = driverLaps[0]?.lap_duration
    if (best == null) continue
    const maxLap = Math.max(...driverLaps.map((l) => l.lap_number))
    rows.push({ driverNumber, best, laps: maxLap })
  }

  rows.sort((a, b) => a.best - b.best)

  const resultRows = rows.map((row, i) => {
    const driver = driverMap.get(row.driverNumber)
    const m = Math.floor(row.best / 60)
    const s = (row.best % 60).toFixed(3).padStart(6, '0')
    return {
      position: i + 1,
      driverNumber: row.driverNumber,
      driverName: driver?.full_name ?? `#${row.driverNumber}`,
      teamName: driver?.team_name ?? '—',
      bestTime: `${m}:${s}`,
      laps: row.laps,
      status: null,
    }
  })

  return mergeDriversIntoLapRows(resultRows, drivers, laps)
}

function emptyGrid(drivers: Driver[]) {
  return drivers
    .sort((a, b) => a.driver_number - b.driver_number)
    .map((d, i) => ({
      position: i + 1,
      driverNumber: d.driver_number,
      driverName: d.full_name,
      teamName: d.team_name,
      bestTime: '—',
      laps: 0,
      status: null,
    }))
}

/** Быстрая загрузка: results + drivers; laps для Race/Sprint/Qualifying. */
export async function loadSessionResults(sessionKey: number, sessionName: string) {
  const isRaceLike = sessionName === 'Race' || sessionName === 'Sprint'

  const [results, drivers] = await Promise.all([
    fetchSafe(() => fetchSessionResults(sessionKey), [] as SessionResult[]),
    fetchSafe(() => fetchDrivers(sessionKey), [] as Driver[]),
  ])

  if (results.length > 0) {
    const isRace = sessionName === 'Race'
    const [laps, pits] = await Promise.all([
      fetchSafe(() => fetchLaps(sessionKey), [] as Lap[]),
      isRace
        ? fetchSafe(() => fetchPit(sessionKey), [] as Pit[])
        : Promise.resolve([] as Pit[]),
    ])
    return buildResultRows(results, drivers, laps, {
      raceBestLap: isRaceLike,
      sessionName,
      sessionKey,
      pitStops: isRace ? pitStopsByDriver(pits) : undefined,
    })
  }

  const laps = await fetchSafe(() => fetchLaps(sessionKey), [] as Lap[])
  if (laps.length > 0) {
    const fromLaps = buildResultRowsFromLaps(laps, drivers)
    if (fromLaps.length > 0) return fromLaps
  }

  if (drivers.length > 0) return emptyGrid(drivers)
  return []
}
