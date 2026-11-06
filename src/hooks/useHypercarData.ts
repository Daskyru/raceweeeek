import { useQuery } from '@tanstack/react-query'
import { loadGt3MeetingsWithDates } from '../api/gt3EventsLoader'
import { mapEventSessions } from '../api/gt3Mappers'
import { loadGt3SessionResults } from '../api/gt3SessionResultsLoader'
import { loadGt3Standings } from '../api/gt3StandingsLoader'
import {
  HYPERCAR_CAR_CLASS,
  HYPERCAR_QUALIFYING_NAME,
  HYPERCAR_SEASON_YEAR,
  HYPERCAR_SERIES_KEY,
} from '../api/hypercarConfig'
import { fetchEvent } from '../api/openwecClient'

export function useHypercarMeetings(seasonYear: number = HYPERCAR_SEASON_YEAR) {
  return useQuery({
    queryKey: ['hypercarMeetings', seasonYear],
    queryFn: () => loadGt3MeetingsWithDates(seasonYear),
    staleTime: 1000 * 60 * 15,
  })
}

export function useHypercarEventSessions(eventId: number | null, seasonYear: number) {
  return useQuery({
    queryKey: ['hypercarEventSessions', eventId],
    queryFn: async () => {
      const detail = await fetchEvent(eventId!)
      return mapEventSessions(detail, seasonYear, HYPERCAR_QUALIFYING_NAME)
    },
    enabled: eventId != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useHypercarStandings(
  seasonYear: number = HYPERCAR_SEASON_YEAR,
  enabled = true,
) {
  return useQuery({
    queryKey: ['hypercarStandings', seasonYear],
    queryFn: () =>
      loadGt3Standings(seasonYear, HYPERCAR_CAR_CLASS, HYPERCAR_SERIES_KEY),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}

export function useHypercarSessionResults(
  sessionId: number | null,
  raceSessionId: number | null = null,
  isRace = false,
) {
  return useQuery({
    queryKey: ['hypercarSessionResults', sessionId, raceSessionId, isRace],
    queryFn: () =>
      loadGt3SessionResults(sessionId!, {
        raceSessionId: raceSessionId ?? undefined,
        isRace,
        carClass: HYPERCAR_CAR_CLASS,
      }),
    enabled: sessionId != null,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  })
}
