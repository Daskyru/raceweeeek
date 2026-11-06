import { GT3_CAR_CLASS, GT3_SERIES_KEY } from './gt3Config'
import type {
  OpenWecEventDetail,
  OpenWecEventListItem,
  OpenWecLap,
  OpenWecSeason,
  OpenWecSessionResult,
  OpenWecSeries,
} from './openwecTypes'

const PROXY_BASE = '/api/openwec'
const DIRECT_BASE = 'https://api.openwec.com/api/v1'
const PROXY_TIMEOUT_MS = 4_000
const DIRECT_TIMEOUT_MS = 20_000

async function fetchJsonFromBase<T>(base: string, path: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`OpenWEC ${res.status}: ${path}`)
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new Error(`OpenWEC non-JSON: ${path}`)
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

export function fetchSeries(): Promise<OpenWecSeries[]> {
  return fetchJson<OpenWecSeries[]>('/series')
}

export function fetchSeasons(seriesKey: string = GT3_SERIES_KEY): Promise<OpenWecSeason[]> {
  return fetchJson<OpenWecSeason[]>(`/series/${seriesKey}/seasons`)
}

export function fetchEvents(
  year: number,
  seriesKey: string = GT3_SERIES_KEY,
): Promise<OpenWecEventListItem[]> {
  return fetchJson<OpenWecEventListItem[]>(`/series/${seriesKey}/seasons/${year}/events`)
}

export function fetchEvent(eventId: number): Promise<OpenWecEventDetail> {
  return fetchJson<OpenWecEventDetail>(`/events/${eventId}`)
}

export function fetchSessionResults(
  sessionId: number,
  carClass: string = GT3_CAR_CLASS,
): Promise<OpenWecSessionResult[]> {
  const q = new URLSearchParams({ car_class: carClass })
  return fetchJson<OpenWecSessionResult[]>(`/sessions/${sessionId}/results?${q}`)
}

export function fetchSessionLaps(
  sessionId: number,
  carNumber: string,
): Promise<OpenWecLap[]> {
  return fetchJson<OpenWecLap[]>(
    `/sessions/${sessionId}/laps/${encodeURIComponent(carNumber)}`,
  )
}

export async function resolveGt3SeasonYear(): Promise<number> {
  const calendarYear = new Date().getFullYear()
  try {
    const seasons = await fetchSeasons()
    const years = seasons.map((s) => s.year)
    if (years.includes(calendarYear)) return calendarYear
    return Math.max(...years)
  } catch {
    return calendarYear
  }
}
