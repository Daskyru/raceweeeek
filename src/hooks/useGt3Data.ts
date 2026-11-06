import { useQuery } from '@tanstack/react-query'
import { loadGt3MeetingsWithDates } from '../api/gt3EventsLoader'
import { mapEventSessions } from '../api/gt3Mappers'
import { loadGt3SessionResults } from '../api/gt3SessionResultsLoader'
import { loadGt3Standings } from '../api/gt3StandingsLoader'
import { fetchEvent, resolveGt3SeasonYear } from '../api/openwecClient'

export function useGt3SeasonYear() {
  return useQuery({
    queryKey: ['gt3SeasonYear'],
    queryFn: resolveGt3SeasonYear,
    staleTime: 1000 * 60 * 60,
  })
}

export function useGt3Meetings(seasonYear: number | undefined) {
  return useQuery({
    queryKey: ['gt3Meetings', seasonYear],
    queryFn: () => loadGt3MeetingsWithDates(seasonYear!),
    enabled: seasonYear != null,
    staleTime: 1000 * 60 * 15,
  })
}

export function useGt3EventSessions(eventId: number | null, seasonYear: number) {
  return useQuery({
    queryKey: ['gt3EventSessions', eventId],
    queryFn: async () => {
      const detail = await fetchEvent(eventId!)
      return mapEventSessions(detail, seasonYear)
    },
    enabled: eventId != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useGt3Standings(seasonYear: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['gt3Standings', seasonYear],
    queryFn: () => loadGt3Standings(seasonYear!),
    enabled: seasonYear != null && enabled,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}

export function useGt3SessionResults(
  sessionId: number | null,
  raceSessionId: number | null = null,
  isRace = false,
) {
  return useQuery({
    queryKey: ['gt3SessionResults', sessionId, raceSessionId, isRace],
    queryFn: () =>
      loadGt3SessionResults(sessionId!, {
        raceSessionId: raceSessionId ?? undefined,
        isRace,
      }),
    enabled: sessionId != null,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  })
}
