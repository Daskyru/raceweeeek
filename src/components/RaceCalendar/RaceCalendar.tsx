import type { Meeting } from '../../api/types'
import { formatMeetingWeekendDates } from '../../utils/format'
import { getMeetingStatus, meetingStatusLabel } from '../../utils/meetings'
import styles from './RaceCalendar.module.css'

const statusClass: Record<string, string> = {
  upcoming: styles.upcoming,
  live: styles.live,
  completed: styles.completed,
  cancelled: styles.cancelled,
}

export function RaceCalendar({ meetings }: { meetings: Meeting[] }) {
  return (
    <ul className={styles.grid}>
      {meetings.map((m) => {
        const status = getMeetingStatus(m)
        const round = m.seasonRound ?? '—'
        return (
          <li key={m.meeting_key} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.round}>R{round}</span>
              <span className={statusClass[status]}>{meetingStatusLabel(status)}</span>
            </div>
            <p className={styles.country}>{m.country_name}</p>
            <p className={styles.circuit}>{m.circuit_short_name}</p>
            <p className={styles.dates}>
              {formatMeetingWeekendDates(m.date_start, m.date_end)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
