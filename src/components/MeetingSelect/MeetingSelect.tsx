import type { Meeting } from '../../api/types'
import styles from './MeetingSelect.module.css'

export function MeetingSelect({
  meetings,
  value,
  onChange,
  embedded = false,
}: {
  meetings: Meeting[]
  value: number | null
  onChange: (key: number) => void
  embedded?: boolean
}) {
  return (
    <div className={embedded ? styles.barEmbedded : styles.bar}>
      <label className={styles.label} htmlFor="gp-select">
        Grand Prix
      </label>
      <select
        id="gp-select"
        className={embedded ? `${styles.select} ${styles.selectEmbedded}` : styles.select}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {meetings.map((m) => (
          <option key={m.meeting_key} value={m.meeting_key}>
            R{m.seasonRound ?? '?'} · {m.meeting_name} — {m.country_name}
          </option>
        ))}
      </select>
    </div>
  )
}
