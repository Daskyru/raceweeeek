import type { Meeting, Session } from './types'
import type { OpenWecEventDetail, OpenWecEventListItem, OpenWecSession } from './openwecTypes'
import { resolveGt3Venue } from './gt3Venues'

/** OpenWEC returns `2025-02-26 11:30:00+00` — JS needs `Z` or `+00:00`. */
export function normalizeOpenWecDateTime(
  raw: string | null | undefined,
): string | null {
  if (raw == null || !String(raw).trim()) return null
  let s = String(raw).trim().replace(' ', 'T')
  if (/\+00$/.test(s)) {
    s = s.replace(/\+00$/, 'Z')
  } else if (/([+-]\d{2})$/.test(s)) {
    s = s.replace(/([+-]\d{2})$/, '$1:00')
  }
  const t = new Date(s).getTime()
  return Number.isFinite(t) ? new Date(s).toISOString() : null
}

function parseSessionTime(iso: string | null): number | null {
  const norm = normalizeOpenWecDateTime(iso)
  if (!norm) return null
  return new Date(norm).getTime()
}

export function eventSessionWindow(
  sessions: OpenWecSession[],
): { dateStart: string; dateEnd: string } | null {
  const times = sessions
    .filter(
      (s) =>
        s.session_type !== 'Test' &&
        normalizeOpenWecDateTime(s.session_at) != null,
    )
    .map((s) => parseSessionTime(s.session_at))
    .filter((t): t is number => t != null)
  if (times.length === 0) return null
  const min = Math.min(...times)
  const max = Math.max(...times)
  return {
    dateStart: new Date(min).toISOString(),
    dateEnd: new Date(max).toISOString(),
  }
}

export function mapEventToMeeting(
  event: OpenWecEventListItem,
  detail: OpenWecEventDetail | null,
  year: number,
): Meeting {
  const window = detail ? eventSessionWindow(detail.sessions) : null
  const name = event.name.trim()
  const venue = resolveGt3Venue(event.raw_id, name)
  const circuit = venue?.circuit ?? name
  const country = venue?.country ?? '—'

  return {
    meeting_key: event.id,
    seasonRound: event.round ?? undefined,
    meeting_name: circuit,
    meeting_official_name: circuit,
    location: circuit,
    country_name: country,
    country_code: '',
    circuit_key: event.id,
    circuit_short_name: circuit,
    circuit_info_url: '',
    circuit_image: '',
    date_start: window?.dateStart ?? new Date().toISOString(),
    date_end: window?.dateEnd ?? new Date().toISOString(),
    year,
    is_cancelled: false,
  }
}

function isWecClassScheduleSession(
  s: OpenWecSession,
  qualifyingPattern: RegExp,
): boolean {
  if (s.session_type === 'Test' || s.session_type === 'Other') return false
  if (normalizeOpenWecDateTime(s.session_at) == null) return false
  if (s.session_type === 'Practice') return true
  if (s.session_type === 'Race') return s.snapshot_hour == null
  if (s.session_type === 'Qualifying' && qualifyingPattern.test(s.name)) return true
  return false
}

function mapOpenWecSessionToUi(
  s: OpenWecSession,
  eventId: number,
  year: number,
  circuitLabel: string,
  countryLabel: string,
  sessionName: Session['session_name'],
): Session {
  const at = normalizeOpenWecDateTime(s.session_at) ?? new Date().toISOString()
  return {
    session_key: s.id,
    meeting_key: eventId,
    session_name: sessionName,
    session_type: s.session_type,
    date_start: at,
    date_end: at,
    circuit_short_name: circuitLabel,
    country_name: countryLabel,
    year,
    is_cancelled: false,
  }
}

/** FP1–3, class Qualifying, Race — без Hyperpole и чужих классов. */
export function mapEventSessions(
  detail: OpenWecEventDetail,
  year: number,
  qualifyingPattern: RegExp = /LMGT3/i,
): Session[] {
  const filtered = detail.sessions
    .filter((s) => isWecClassScheduleSession(s, qualifyingPattern))
    .sort(
      (a, b) =>
        parseSessionTime(a.session_at)! - parseSessionTime(b.session_at)!,
    )

  const venue = resolveGt3Venue('', detail.name)
  const circuit = venue?.circuit ?? detail.name.trim()
  const country = venue?.country ?? '—'

  const practiceLabels = ['Practice 1', 'Practice 2', 'Practice 3'] as const
  const practices = filtered.filter((s) => s.session_type === 'Practice')
  const qualifying = filtered.find((s) => s.session_type === 'Qualifying')
  const race = filtered.find((s) => s.session_type === 'Race')

  const out: Session[] = []
  practices.slice(0, 3).forEach((s, i) => {
    out.push(
      mapOpenWecSessionToUi(
        s,
        detail.id,
        year,
        circuit,
        country,
        practiceLabels[i],
      ),
    )
  })
  if (qualifying) {
    out.push(
      mapOpenWecSessionToUi(
        qualifying,
        detail.id,
        year,
        circuit,
        country,
        'Qualifying',
      ),
    )
  }
  if (race) {
    out.push(
      mapOpenWecSessionToUi(race, detail.id, year, circuit, country, 'Race'),
    )
  }
  return out
}

export function pickRaceSessionId(detail: OpenWecEventDetail): number | null {
  const race = detail.sessions.find(
    (s) => s.session_type === 'Race' && s.snapshot_hour == null,
  )
  return race?.id ?? null
}
