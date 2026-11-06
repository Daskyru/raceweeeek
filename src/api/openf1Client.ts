import type {
  ChampionshipDriver,
  ChampionshipTeam,
  CircuitInfo,
  Driver,
  Lap,
  Meeting,
  Pit,
  Session,
  SessionResult,
  Stint,
} from './types'

const PROXY_BASE = '/api/openf1'
const DIRECT_BASE = 'https://api.openf1.org/v1'
const PROXY_TIMEOUT_MS = 4_000
const DIRECT_TIMEOUT_MS = 20_000

async function fetchJsonFromBase<T>(
  base: string,
  path: string,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`OpenF1 ${res.status}: ${path}`)
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new Error(`OpenF1 non-JSON: ${path}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  try {
    return await fetchJsonFromBase<T>(PROXY_BASE, path, PROXY_TIMEOUT_MS)
  } catch {
    return fetchJsonFromBase<T>(DIRECT_BASE, path, DIRECT_TIMEOUT_MS)
  }
}

export async function fetchMeetings(year: number): Promise<Meeting[]> {
  return fetchJson<Meeting[]>(`/meetings?year=${year}`)
}

export async function fetchSessions(meetingKey: number): Promise<Session[]> {
  return fetchJson<Session[]>(`/sessions?meeting_key=${meetingKey}`)
}

export async function fetchRaceSessions(year: number): Promise<Session[]> {
  return fetchJson<Session[]>(`/sessions?session_name=Race&year=${year}`)
}

export async function fetchDrivers(sessionKey: number): Promise<Driver[]> {
  return fetchJson<Driver[]>(`/drivers?session_key=${sessionKey}`)
}

export async function fetchSessionResults(sessionKey: number): Promise<SessionResult[]> {
  return fetchJson<SessionResult[]>(`/session_result?session_key=${sessionKey}`)
}

export async function fetchStints(sessionKey: number): Promise<Stint[]> {
  return fetchJson<Stint[]>(`/stints?session_key=${sessionKey}`)
}

export async function fetchLaps(sessionKey: number): Promise<Lap[]> {
  return fetchJson<Lap[]>(`/laps?session_key=${sessionKey}`)
}

export async function fetchPit(sessionKey: number): Promise<Pit[]> {
  return fetchJson<Pit[]>(`/pit?session_key=${sessionKey}`)
}

export async function fetchChampionshipDrivers(
  sessionKey: number,
): Promise<ChampionshipDriver[]> {
  return fetchJson<ChampionshipDriver[]>(
    `/championship_drivers?session_key=${sessionKey}`,
  )
}

export async function fetchChampionshipTeams(
  sessionKey: number,
): Promise<ChampionshipTeam[]> {
  return fetchJson<ChampionshipTeam[]>(`/championship_teams?session_key=${sessionKey}`)
}

export async function fetchCircuitInfo(proxyPath: string): Promise<CircuitInfo> {
  const res = await fetch(proxyPath)
  if (!res.ok) {
    throw new Error(`Circuit ${res.status}`)
  }
  return res.json() as Promise<CircuitInfo>
}

export function findLastCompletedRaceSession(sessions: Session[]): Session | null {
  const now = Date.now()
  const races = sessions
    .filter((s) => s.session_name === 'Race' && !s.is_cancelled)
    .filter((s) => new Date(s.date_end).getTime() < now)
    .sort(
      (a, b) => new Date(b.date_end).getTime() - new Date(a.date_end).getTime(),
    )
  return races[0] ?? null
}

export async function resolveSeasonYear(): Promise<number> {
  const year = new Date().getFullYear()
  try {
    const meetings = await fetchMeetings(year)
    const races = meetings.filter(
      (m) => !m.meeting_name.toLowerCase().includes('testing'),
    )
    if (races.length > 0) return year
  } catch {
    /* try previous year */
  }
  return year - 1
}
