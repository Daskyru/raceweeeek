import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import styles from './HomePage.module.css'

const SERIES = [
  { id: 'f1', name: 'Formula 1', to: '/formula-1', active: true },
  { id: 'gt3', name: 'WEC (LMGT3)', to: '/lmgt3', active: true },
  { id: 'hypercar', name: 'WEC Hypercar', to: '/wec-hypercar', active: true },
  { id: 'nascar', name: 'NASCAR', active: false },
] as const

export function HomePage() {
  return (
    <Layout>
      <div className={styles.page}>
        <h1 className={styles.title}>
          Race<span className={styles.titleAccent}>WEEEEK</span>
        </h1>
        <div className={styles.grid}>
          {SERIES.map((s) =>
            s.active ? (
              <Link key={s.id} className={styles.cardLink} to={s.to}>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>{s.name}</p>
                </div>
              </Link>
            ) : (
              <div
                key={s.id}
                className={styles.cardDisabled}
                aria-disabled="true"
              >
                <span className={styles.badge}>Скоро</span>
                <p className={styles.cardTitle}>{s.name}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </Layout>
  )
}
