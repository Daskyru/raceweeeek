import { useQuery } from '@tanstack/react-query'
import {
  fetchCircuitInfo,
  fetchLaps,
  fetchMeetings,
  fetchSessions,
  resolveSeasonYear,
} from '../api/openf1Client'
import { loadChampionshipStandings } from '../api/standingsLoader'
import { loadSessionResults } from '../api/sessionResultsLoader'
import { hasIncompleteSessionTimes } from '../utils/results'
import { circuitProxyUrl, prepareRaceMeetings } from '../utils/meetings'

export function useSeasonYear() {
  return useQuery({
    queryKey: ['seasonYear'],
    queryFn: resolveSeasonYear,
    staleTime: 1000 * 60 * 60,
  })
}

export function useMeetings(season: number | undefined) {
  return useQuery({
    queryKey: ['meetings', season],
    queryFn: () => fetchMeetings(season!),
    enabled: season != null,
    staleTime: 1000 * 60 * 10,
    select: (data) => prepareRaceMeetings(data),
  })
}

export function useSessions(meetingKey: number | null) {
  return useQuery({
    queryKey: ['sessions', meetingKey],
    queryFn: () => fetchSessions(meetingKey!),
    enabled: meetingKey != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useStandings(season: number | undefined) {
  return useQuery({
    queryKey: ['standings', season],
    queryFn: () => loadChampionshipStandings(season!),
    enabled: season != null,
    staleTime: 1000 * 60 * 15,
    retry: 2,
  })
}

export function useSessionResults(
  sessionKey: number | null | undefined,
  sessionName: string | undefined,
  sessionStarted: boolean,
) {
  return useQuery({
    queryKey: ['sessionResults', sessionKey, sessionName],
    queryFn: () => loadSessionResults(sessionKey!, sessionName ?? ''),
    enabled: sessionKey != null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (!sessionStarted) return false
      if (
        sessionName === 'Qualifying' ||
        sessionName === 'Sprint Qualifying'
      ) {
        return false
      }
      const rows = query.state.data
      if (query.state.dataUpdateCount > 10) return false
      if (hasIncompleteSessionTimes(rows, sessionName)) return 20_000
      return false
    },
  })
}

export function useCircuit(circuitInfoUrl: string | undefined) {
  const proxy = circuitInfoUrl ? circuitProxyUrl(circuitInfoUrl) : null
  return useQuery({
    queryKey: ['circuit', proxy],
    queryFn: () => fetchCircuitInfo(proxy!),
    enabled: proxy != null,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  })
}

export function useSectorTimes(sessionKey: number | null | undefined) {
  return useQuery({
    queryKey: ['sectorLaps', sessionKey],
    queryFn: async () => {
      const laps = await fetchLaps(sessionKey!)
      const valid = laps.filter(
        (l) =>
          l.lap_duration != null &&
          l.lap_duration > 0 &&
          l.duration_sector_1 != null &&
          !l.is_pit_out_lap,
      )
      if (valid.length === 0) return null
      valid.sort((a, b) => (a.lap_duration ?? 0) - (b.lap_duration ?? 0))
      const best = valid[0]
      return {
        s1: best.duration_sector_1,
        s2: best.duration_sector_2,
        s3: best.duration_sector_3,
      }
    },
    enabled: sessionKey != null,
    staleTime: 1000 * 60 * 30,
  })
}
