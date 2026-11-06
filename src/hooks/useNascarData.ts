import { useQuery } from '@tanstack/react-query'
import { fetchRaceListBasic, resolveNascarSeasonYear } from '../api/nascarClient'
import { mapCupRaceToSessions, mapCupRacesToMeetings } from '../api/nascarMappers'
import { loadNascarSessionResults } from '../api/nascarSessionResultsLoader'
import { loadNascarStandings } from '../api/nascarStandingsLoader'

export function useNascarSeasonYear() {
  return useQuery({
    queryKey: ['nascarSeasonYear'],
    queryFn: resolveNascarSeasonYear,
    staleTime: 1000 * 60 * 60,
  })
}

export function useNascarMeetings(season: number | undefined) {
  return useQuery({
    queryKey: ['nascarMeetings', season],
    queryFn: async () => {
      const list = await fetchRaceListBasic(season!)
      return mapCupRacesToMeetings(list.series_1)
    },
    enabled: season != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useNascarSessions(raceId: number | null, season: number | undefined) {
  return useQuery({
    queryKey: ['nascarSessions', season, raceId],
    queryFn: async () => {
      const list = await fetchRaceListBasic(season!)
      const race = list.series_1.find((r) => r.race_id === raceId)
      if (!race) return []
      return mapCupRaceToSessions(race)
    },
    enabled: season != null && raceId != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useNascarStandings(season: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['nascarStandings', season],
    queryFn: () => loadNascarStandings(season!),
    enabled: season != null && enabled,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })
}

export function useNascarSessionResults(
  season: number | undefined,
  raceId: number | null,
  sessionKey: number | null,
  sessionStarted: boolean,
) {
  return useQuery({
    queryKey: ['nascarSessionResults', season, raceId, sessionKey],
    queryFn: () => loadNascarSessionResults(season!, raceId!, sessionKey!),
    enabled: season != null && raceId != null && sessionKey != null && sessionStarted,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })
}
