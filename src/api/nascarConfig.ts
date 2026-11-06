/** NASCAR Cup Series on cf.nascar.com/cacher. */
export const NASCAR_SERIES_ID = 1

export const NASCAR_PROXY_BASE = '/api/nascar'
export const NASCAR_DIRECT_BASE = 'https://cf.nascar.com'

/** UI session kind encoded in `session_key % 10`. */
export const NASCAR_SESSION_KIND = {
  fp1: 1,
  fp2: 2,
  qualifying: 3,
  race: 9,
} as const

export type NascarSessionKind =
  (typeof NASCAR_SESSION_KIND)[keyof typeof NASCAR_SESSION_KIND]

export function nascarSessionKey(raceId: number, kind: NascarSessionKind): number {
  return raceId * 10 + kind
}

export function nascarKindFromSessionKey(sessionKey: number): NascarSessionKind {
  const kind = sessionKey % 10
  if (kind === NASCAR_SESSION_KIND.fp1) return NASCAR_SESSION_KIND.fp1
  if (kind === NASCAR_SESSION_KIND.fp2) return NASCAR_SESSION_KIND.fp2
  if (kind === NASCAR_SESSION_KIND.qualifying) return NASCAR_SESSION_KIND.qualifying
  return NASCAR_SESSION_KIND.race
}
