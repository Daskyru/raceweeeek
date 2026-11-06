import type { Session, SessionUiKey } from '../api/types'

const SESSION_NAME_TO_UI: Record<string, SessionUiKey> = {
  'Practice 1': 'fp1',
  'Practice 2': 'fp2',
  'Practice 3': 'fp3',
  'Sprint Qualifying': 'sprint-qualifying',
  Sprint: 'sprint',
  Qualifying: 'qualifying',
  Race: 'race',
}

export const SESSION_UI_LABELS: Record<SessionUiKey, string> = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
  'sprint-qualifying': 'Sprint Qualifying',
  sprint: 'Sprint',
  qualifying: 'Qualifying',
  race: 'Race',
}

export const ALL_SESSION_KEYS: SessionUiKey[] = [
  'fp1',
  'fp2',
  'fp3',
  'sprint-qualifying',
  'sprint',
  'qualifying',
  'race',
]

export function sessionToUiKey(session: Session): SessionUiKey | null {
  return SESSION_NAME_TO_UI[session.session_name] ?? null
}

export function findSessionByUiKey(
  sessions: Session[],
  key: SessionUiKey,
): Session | undefined {
  return sessions.find((s) => sessionToUiKey(s) === key)
}

export function isSprintWeekend(sessions: Session[]): boolean {
  return sessions.some((s) => s.session_name === 'Sprint')
}

export function availableSessionKeys(sessions: Session[]): SessionUiKey[] {
  const sprint = isSprintWeekend(sessions)
  const present = new Set(
    sessions.map(sessionToUiKey).filter((k): k is SessionUiKey => k != null),
  )

  return ALL_SESSION_KEYS.filter((key) => {
    if (!present.has(key)) return false
    if (sprint && (key === 'fp2' || key === 'fp3')) return false
    return true
  })
}

/** Сессия ещё не началась (нет смысла показывать результаты). */
export function isSessionNotStarted(session: Session): boolean {
  return new Date(session.date_start).getTime() > Date.now()
}

/** @deprecated use isSessionNotStarted for results UI */
export function isSessionUpcoming(session: Session): boolean {
  return isSessionNotStarted(session)
}
