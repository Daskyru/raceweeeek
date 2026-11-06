import { NASCAR_DIRECT_BASE, NASCAR_PROXY_BASE, NASCAR_SERIES_ID } from './nascarConfig'
import type {
  NascarPointsFeedRow,
  NascarRaceListBasic,
  NascarWeekendFeed,
} from './nascarTypes'

const PROXY_TIMEOUT_MS = 8_000
const DIRECT_TIMEOUT_MS = 25_000

const NASCAR_HEADERS = {
  Accept: 'application/json',
  Referer: 'https://www.nascar.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}

async function fetchJsonFromBase<T>(
  base: string,
  path: string,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${path}`, {
      signal: controller.signal,
      headers: NASCAR_HEADERS,
    })
    if (!res.ok) {
      throw new Error(`NASCAR ${res.status}: ${path}`)
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('json') && !contentType.includes('text/plain')) {
      const peek = (await res.clone().text()).trimStart()
      if (peek.startsWith('<')) {
        throw new Error(`NASCAR non-JSON: ${path}`)
      }
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchNascarJson<T>(path: string): Promise<T> {
  try {
    return await fetchJsonFromBase<T>(NASCAR_PROXY_BASE, path, PROXY_TIMEOUT_MS)
  } catch {
    return fetchJsonFromBase<T>(NASCAR_DIRECT_BASE, path, DIRECT_TIMEOUT_MS)
  }
}

export function fetchRaceListBasic(year: number): Promise<NascarRaceListBasic> {
  return fetchNascarJson<NascarRaceListBasic>(`/cacher/${year}/race_list_basic.json`)
}

export function fetchWeekendFeed(
  year: number,
  raceId: number,
  seriesId: number = NASCAR_SERIES_ID,
): Promise<NascarWeekendFeed> {
  return fetchNascarJson<NascarWeekendFeed>(
    `/cacher/${year}/${seriesId}/${raceId}/weekend-feed.json`,
  )
}

export function normalizeNascarFeedArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (!raw || typeof raw !== 'object') return []
  const root = raw as Record<string, unknown>
  if (Array.isArray(root.response)) return root.response as T[]
  return Object.values(root).filter(
    (v): v is T => v != null && typeof v === 'object',
  ) as T[]
}

export async function fetchPointsFeed(year: number): Promise<NascarPointsFeedRow[]> {
  const path = `/cacher/${year}/${NASCAR_SERIES_ID}/points-feed.json`
  const raw = await fetchNascarJson<unknown>(path)
  return normalizeNascarFeedArray<NascarPointsFeedRow>(raw).filter(
    (row) => row.position > 0 && row.driver_id > 0,
  )
}

export async function resolveNascarSeasonYear(): Promise<number> {
  const calendarYear = new Date().getFullYear()
  for (const year of [calendarYear, calendarYear - 1]) {
    try {
      const list = await fetchRaceListBasic(year)
      if (list.series_1?.length) return year
    } catch {
      /* try previous */
    }
  }
  return calendarYear
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      out[i] = await fn(items[i]!)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return out
}
