import type { Meeting, MeetingStatus } from '../api/types'

export function isRaceMeeting(meeting: Meeting): boolean {
  const name = meeting.meeting_name.toLowerCase()
  return !name.includes('testing') && !name.includes('test')
}

export function sortMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
  )
}

export function getMeetingStatus(meeting: Meeting): MeetingStatus {
  if (meeting.is_cancelled) return 'cancelled'
  const now = Date.now()
  const start = new Date(meeting.date_start).getTime()
  const end = new Date(meeting.date_end).getTime()
  if (now < start) return 'upcoming'
  if (now <= end) return 'live'
  return 'completed'
}

export function meetingStatusLabel(status: MeetingStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Предстоит'
    case 'live':
      return 'Идёт'
    case 'completed':
      return 'Завершена'
    case 'cancelled':
      return 'Отменена'
  }
}

export function pickDefaultMeeting(meetings: Meeting[]): Meeting | null {
  const race = sortMeetings(meetings.filter(isRaceMeeting))
  if (race.length === 0) return null

  const now = Date.now()
  const live = race.find((m) => {
    const start = new Date(m.date_start).getTime()
    const end = new Date(m.date_end).getTime()
    return now >= start && now <= end
  })
  if (live) return live

  const upcoming = race.find((m) => new Date(m.date_start).getTime() > now)
  if (upcoming) return upcoming

  return race[race.length - 1] ?? null
}

/** Rounds hidden from calendar, dropdown, and schedule (season round numbers). */
export const EXCLUDED_SEASON_ROUNDS = new Set([4, 5])

export function attachSeasonRounds(meetings: Meeting[]): Meeting[] {
  return meetings.map((m, i) => ({ ...m, seasonRound: i + 1 }))
}

export function filterExcludedSeasonRounds(meetings: Meeting[]): Meeting[] {
  return meetings.filter((m) => !EXCLUDED_SEASON_ROUNDS.has(m.seasonRound ?? 0))
}

export function prepareRaceMeetings(raw: Meeting[]): Meeting[] {
  const sorted = sortMeetings(raw.filter(isRaceMeeting))
  const filtered = filterExcludedSeasonRounds(attachSeasonRounds(sorted))
  // Порядковый номер в календаре (1, 2, 3…) и тот же номер файла Race/N.png
  return filtered.map((m, i) => ({
    ...m,
    seasonRound: i + 1,
  }))
}

export function raceSchemeImageUrl(calendarRound: number): string {
  return `/Race/${calendarRound}.png`
}

export function circuitProxyUrl(circuitInfoUrl: string): string {
  try {
    const url = new URL(circuitInfoUrl)
    return `/api/circuit${url.pathname}`
  } catch {
    return circuitInfoUrl
  }
}
