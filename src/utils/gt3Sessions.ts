import type { Session, SessionUiKey } from '../api/types'
import {
  ALL_SESSION_KEYS,
  availableSessionKeys as f1AvailableSessionKeys,
  findSessionByUiKey,
} from './sessions'

/** WEC: map Practice 1–3, Qualifying, Race to F1-style UI keys. */
export function gt3AvailableSessionKeys(sessions: Session[]): SessionUiKey[] {
  const base = f1AvailableSessionKeys(sessions)
  return ALL_SESSION_KEYS.filter((key) => {
    if (key === 'sprint' || key === 'sprint-qualifying') return false
    return base.includes(key)
  })
}

export function gt3FindSessionByUiKey(
  sessions: Session[],
  key: SessionUiKey,
): Session | undefined {
  if (key === 'sprint' || key === 'sprint-qualifying') return undefined
  return findSessionByUiKey(sessions, key)
}

export function gt3DefaultSessionKey(sessions: Session[]): SessionUiKey {
  const available = gt3AvailableSessionKeys(sessions)
  if (available.includes('race')) return 'race'
  return available[available.length - 1] ?? 'fp1'
}

export function gt3SessionStarted(session: Session): boolean {
  return new Date(session.date_start).getTime() <= Date.now()
}
