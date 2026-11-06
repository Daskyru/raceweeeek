import { Link } from 'react-router-dom'
import styles from './Breadcrumbs.module.css'

interface Crumb {
  label: string
  to?: string
  /** Red F1 branding for the current (non-link) crumb only */
  f1Red?: boolean
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className={styles.nav} aria-label="Хлебные крошки">
      {items.map((item, i) => (
        <span key={item.label} style={{ display: 'contents' }}>
          {i > 0 && <span className={styles.sep} aria-hidden>→</span>}
          {item.to ? (
            <Link className={styles.link} to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span
              className={item.f1Red ? `${styles.current} ${styles.currentF1Red}` : styles.current}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
