import { fetchEvent, fetchEvents, fetchSessionResults } from './openwecClient'
import { pickRaceSessionId } from './gt3Mappers'
import type { OpenWecResultDriver } from './openwecTypes'
import {
  applyWecRacePoints,
  assignTiedStandingsPositions,
  compareWecStandingsAgg,
  formatGt3TeamEntryLabel,
  initWecStandingsAgg,
  isLmgt3ClassifiedResult,
  lmgt3ClassPositionForRaceRow,
  orderLmgt3RaceResults,
  pointsForLmgt3ClassPosition,
  type WecStandingsAgg,
} from './gt3Scoring'

export interface Gt3StandingDriver {
  id: string
  position: number
  driverNumber: number
  name: string
  team: string
  points: number
}

export interface Gt3StandingTeam {
  position: number
  name: string
  points: number
}

function carNumberToInt(carNumber: string): number {
  const n = parseInt(carNumber, 10)
  return Number.isFinite(n) ? n : 0
}

function driverDisplayName(d: OpenWecResultDriver): string {
  return `${d.first_name} ${d.last_name}`.trim()
}

function carNumberFromTeamLabel(label: string): number {
  const m = /^#(\d+)/.exec(label.trim())
  return m ? parseInt(m[1], 10) : 0
}

async function raceSessionIdsForSeason(
  year: number,
  seriesKey?: string,
): Promise<number[]> {
  const events = await fetchEvents(year, seriesKey)
  const ids: number[] = []
  const batchSize = 4
  for (let i = 0; i < events.length; i += batchSize) {
    const chunk = events.slice(i, i + batchSize)
    const details = await Promise.all(chunk.map((e) => fetchEvent(e.id)))
    for (const d of details) {
      const raceId = pickRaceSessionId(d)
      if (raceId != null) ids.push(raceId)
    }
  }
  return ids
}

function awardPointsFromRace(
  results: Awaited<ReturnType<typeof fetchSessionResults>>,
  teamPoints: Map<string, { label: string; agg: WecStandingsAgg }>,
  driverPoints: Map<
    number,
    { name: string; team: string; number: number; agg: WecStandingsAgg }
  >,
): void {
  const ordered = orderLmgt3RaceResults(results)

  for (const r of ordered) {
    if (!isLmgt3ClassifiedResult(r.status)) continue

    const classPos = lmgt3ClassPositionForRaceRow(ordered, r)
    const pts = pointsForLmgt3ClassPosition(classPos)
    if (pts === 0) continue

    const carKey = r.car_number.trim()
    const teamLabel = formatGt3TeamEntryLabel(r)
    const teamEntry = teamPoints.get(carKey)
    if (teamEntry) {
      applyWecRacePoints(teamEntry.agg, classPos, pts)
      teamEntry.label = teamLabel
    } else {
      const agg = initWecStandingsAgg()
      applyWecRacePoints(agg, classPos, pts)
      teamPoints.set(carKey, { label: teamLabel, agg })
    }

    const carNum = carNumberToInt(r.car_number)
    for (const d of r.drivers) {
      const prev = driverPoints.get(d.id)
      if (prev) {
        applyWecRacePoints(prev.agg, classPos, pts)
        prev.team = r.team
        prev.number = carNum
      } else {
        const agg = initWecStandingsAgg()
        applyWecRacePoints(agg, classPos, pts)
        driverPoints.set(d.id, {
          name: driverDisplayName(d),
          team: r.team,
          number: carNum,
          agg,
        })
      }
    }
  }
}

export async function loadGt3Standings(
  year: number,
  carClass?: string,
  seriesKey?: string,
): Promise<{
  drivers: Gt3StandingDriver[]
  teams: Gt3StandingTeam[]
}> {
  const sessionIds = await raceSessionIdsForSeason(year, seriesKey)
  const teamPoints = new Map<string, { label: string; agg: WecStandingsAgg }>()
  const driverPoints = new Map<
    number,
    { name: string; team: string; number: number; agg: WecStandingsAgg }
  >()

  for (let i = 0; i < sessionIds.length; i += 3) {
    const chunk = sessionIds.slice(i, i + 3)
    const resultSets = await Promise.all(
      chunk.map((id) => fetchSessionResults(id, carClass)),
    )
    for (const results of resultSets) {
      awardPointsFromRace(results, teamPoints, driverPoints)
    }
  }

  const teamsSorted = [...teamPoints.values()]
    .map((row) => ({ name: row.label, points: row.agg.points, agg: row.agg }))
    .sort((a, b) => {
      const byAgg = compareWecStandingsAgg(a.agg, b.agg)
      if (byAgg !== 0) return byAgg
      return carNumberFromTeamLabel(a.name) - carNumberFromTeamLabel(b.name)
    })

  const teams: Gt3StandingTeam[] = assignTiedStandingsPositions(
    teamsSorted.map(({ name, points }) => ({ name, points })),
  )

  const driversSorted = [...driverPoints.entries()]
    .map(([driverId, row]) => ({
      id: String(driverId),
      driverNumber: row.number,
      name: row.name,
      team: row.team,
      points: row.agg.points,
      agg: row.agg,
    }))
    .sort((a, b) => {
      const byAgg = compareWecStandingsAgg(a.agg, b.agg)
      if (byAgg !== 0) return byAgg
      const byName = a.name.localeCompare(b.name, 'ru')
      if (byName !== 0) return byName
      return a.driverNumber - b.driverNumber
    })

  const drivers: Gt3StandingDriver[] = assignTiedStandingsPositions(
    driversSorted.map(({ id, driverNumber, name, team, points }) => ({
      id,
      driverNumber,
      name,
      team,
      points,
    })),
  )

  return { drivers, teams }
}
