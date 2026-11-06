import type { Meeting } from '../../api/types'
import styles from './MeetingSelect.module.css'

function defaultOptionLabel(m: Meeting): string {
  return `R${m.seasonRound ?? '?'} · ${m.meeting_name} — ${m.country_name}`
}

export function MeetingSelect({
  meetings,
  value,
  onChange,
  embedded = false,
  label = 'Grand Prix',
  selectId = 'gp-select',
  formatOption = defaultOptionLabel,
}: {
  meetings: Meeting[]
  value: number | null
  onChange: (key: number) => void
  embedded?: boolean
  /** Accessible label + `htmlFor` target */
  label?: string
  selectId?: string
  formatOption?: (m: Meeting) => string
}) {
  return (
    <div className={embedded ? styles.barEmbedded : styles.bar}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={embedded ? `${styles.select} ${styles.selectEmbedded}` : styles.select}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {meetings.map((m) => (
          <option key={m.meeting_key} value={m.meeting_key}>
            {formatOption(m)}
          </option>
        ))}
      </select>
    </div>
  )
}
