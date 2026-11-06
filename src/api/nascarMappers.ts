import {
  NASCAR_SERIES_ID,
  NASCAR_SESSION_KIND,
  nascarSessionKey,
} from './nascarConfig'
import type { NascarRaceListItem, NascarScheduleEvent } from './nascarTypes'
import type { Meeting, Session } from './types'

function onTrackEvents(schedule: NascarScheduleEvent[]): NascarScheduleEvent[] {
  return schedule
    .filter((e) => e.run_type > 0 && e.start_time_utc)
    .sort(
      (a, b) =>
        new Date(a.start_time_utc).getTime() - new Date(b.start_time_utc).getTime(),
    )
}

/** Cup points races only (`race_type_id === 1`). Type 2 = exhibition (Clash, Duels, All-Star). */
export function cupRacesFromList(list: NascarRaceListItem[]): NascarRaceListItem[] {
  return [...list]
    .filter((r) => r.series_id === NASCAR_SERIES_ID && r.race_type_id === 1)
    .sort(
      (a, b) =>
        new Date(a.date_scheduled).getTime() - new Date(b.date_scheduled).getTime(),
    )
}

export function mapCupRaceToMeeting(
  race: NascarRaceListItem,
  seasonRound: number,
): Meeting {
  const events = onTrackEvents(race.schedule ?? [])
  const start = events[0]?.start_time_utc ?? race.date_scheduled
  const raceEv = events.filter((e) => e.run_type === 3)[0]
  /** Prefer official `race_date` (matches nascar.com calendar); avoid using non-race blocks as weekend end. */
  const end =
    race.race_date ||
    raceEv?.start_time_utc ||
    events[events.length - 1]?.start_time_utc ||
    start
  const track = race.track_name.trim()

  return {
    meeting_key: race.race_id,
    seasonRound,
    meeting_name: race.race_name,
    meeting_official_name: race.race_name,
    location: track,
    country_name: 'United States',
    country_code: 'US',
    circuit_key: race.track_id,
    circuit_short_name: track,
    circuit_info_url: '',
    circuit_image: '',
    date_start: start,
    date_end: end,
    year: race.race_season,
    is_cancelled: false,
  }
}

export function mapCupRacesToMeetings(races: NascarRaceListItem[]): Meeting[] {
  return cupRacesFromList(races).map((r, i) => mapCupRaceToMeeting(r, i + 1))
}

function practiceLabel(index: number): string {
  return index === 0 ? 'Practice 1' : 'Practice 2'
}

export function mapCupRaceToSessions(race: NascarRaceListItem): Session[] {
  const events = onTrackEvents(race.schedule ?? [])
  const practices = events.filter((e) => e.run_type === 1)
  const qualifying = events.filter((e) => e.run_type === 2)
  const races = events.filter((e) => e.run_type === 3)

  const sessions: Session[] = []
  const track = race.track_name.trim()

  practices.slice(0, 2).forEach((ev, idx) => {
    const kind = idx === 0 ? NASCAR_SESSION_KIND.fp1 : NASCAR_SESSION_KIND.fp2
    sessions.push({
      session_key: nascarSessionKey(race.race_id, kind),
      meeting_key: race.race_id,
      session_name: practiceLabel(idx),
      session_type: 'Practice',
      date_start: ev.start_time_utc,
      date_end: ev.start_time_utc,
      circuit_short_name: track,
      country_name: 'United States',
      year: race.race_season,
      is_cancelled: false,
    })
  })

  const qualEv = qualifying[0]
  if (qualEv) {
    sessions.push({
      session_key: nascarSessionKey(race.race_id, NASCAR_SESSION_KIND.qualifying),
      meeting_key: race.race_id,
      session_name: 'Qualifying',
      session_type: 'Qualifying',
      date_start: qualEv.start_time_utc,
      date_end: qualEv.start_time_utc,
      circuit_short_name: track,
      country_name: 'United States',
      year: race.race_season,
      is_cancelled: false,
    })
  }

  const raceEv = races[0]
  const raceStart = raceEv?.start_time_utc ?? race.race_date
  sessions.push({
    session_key: nascarSessionKey(race.race_id, NASCAR_SESSION_KIND.race),
    meeting_key: race.race_id,
    session_name: 'Race',
    session_type: 'Race',
    date_start: raceStart,
    date_end: race.race_date,
    circuit_short_name: track,
    country_name: 'United States',
    year: race.race_season,
    is_cancelled: false,
  })

  return sessions
}

export function isCupRaceCompleted(race: NascarRaceListItem): boolean {
  return race.winner_driver_id != null && race.winner_driver_id > 0
}
