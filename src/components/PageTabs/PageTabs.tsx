import styles from './PageTabs.module.css'

const SECTIONS = [
  { id: 'standings', label: 'Зачёты' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'stage', label: 'Этап' },
  { id: 'results', label: 'Результаты' },
] as const

export function PageTabs() {
  return (
    <nav className={styles.nav} aria-label="Разделы">
      {SECTIONS.map((s) => (
        <a key={s.id} className={styles.link} href={`#${s.id}`}>
          {s.label}
        </a>
      ))}
    </nav>
  )
}
