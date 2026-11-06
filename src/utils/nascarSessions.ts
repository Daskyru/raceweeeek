import type { Session, SessionUiKey } from '../api/types'
import {
  ALL_SESSION_KEYS,
  findSessionByUiKey,
  isSessionNotStarted,
} from './sessions'

/** Cup UI: FP1, Qualifying, Race (no FP2 / sprint / FP3). */
export function nascarAvailableSessionKeys(sessions: Session[]): SessionUiKey[] {
  const present = new Set<SessionUiKey>()
  for (const s of sessions) {
    if (s.session_name === 'Practice 1') present.add('fp1')
    else if (s.session_name === 'Practice 2') present.add('fp2')
    else if (s.session_name === 'Qualifying') present.add('qualifying')
    else if (s.session_name === 'Race') present.add('race')
  }

  return ALL_SESSION_KEYS.filter((key) => {
    if (
      key === 'sprint' ||
      key === 'sprint-qualifying' ||
      key === 'fp3' ||
      key === 'fp2'
    ) {
      return false
    }
    return present.has(key)
  })
}

export function nascarFindSessionByUiKey(
  sessions: Session[],
  key: SessionUiKey,
): Session | undefined {
  if (
    key === 'sprint' ||
    key === 'sprint-qualifying' ||
    key === 'fp3' ||
    key === 'fp2'
  ) {
    return undefined
  }
  if (key === 'fp1') {
    return (
      sessions.find((s) => s.session_name === 'Practice 1') ??
      sessions.find((s) => s.session_type === 'Practice')
    )
  }
  return findSessionByUiKey(sessions, key)
}

export function nascarDefaultSessionKey(sessions: Session[]): SessionUiKey {
  const available = nascarAvailableSessionKeys(sessions)
  if (available.includes('race')) return 'race'
  return available[available.length - 1] ?? 'fp1'
}

export function nascarSessionStarted(session: Session): boolean {
  return !isSessionNotStarted(session)
}
