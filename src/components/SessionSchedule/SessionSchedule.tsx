import type { Session } from '../../api/types'
import { formatSessionTime } from '../../utils/format'
import { SESSION_UI_LABELS, sessionToUiKey } from '../../utils/sessions'
import styles from './SessionSchedule.module.css'

const ORDER = [
  'fp1',
  'fp2',
  'fp3',
  'sprint-qualifying',
  'sprint',
  'qualifying',
  'race',
] as const

export function SessionSchedule({ sessions }: { sessions: Session[] }) {
  const mapped = sessions
    .map((s) => ({ session: s, key: sessionToUiKey(s) }))
    .filter((x): x is { session: Session; key: NonNullable<typeof x.key> } => x.key != null)
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))

  if (mapped.length === 0) {
    return <p>Расписание сессий пока недоступно.</p>
  }

  return (
    <ul className={styles.list}>
      {mapped.map(({ session, key }) => {
        const start = formatSessionTime(session.date_start)
        const end = formatSessionTime(session.date_end)
        return (
          <li key={session.session_key} className={styles.row}>
            <span className={styles.sessionName}>{SESSION_UI_LABELS[key]}</span>
            <div className={styles.times}>
              <span>Начало: {start.local} ({start.utc})</span>
              <span>Окончание: {end.local} ({end.utc})</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
