import styles from './LoadingState.module.css'

export function LoadingSpinner({ variant = 'default' }: { variant?: 'default' | 'f1' }) {
  return (
    <div
      className={variant === 'f1' ? styles.wrapCentered : styles.wrap}
      role="status"
      aria-label="Загрузка"
    >
      <div className={variant === 'f1' ? styles.spinnerF1 : styles.spinner} />
    </div>
  )
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={styles.wrap} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  )
}
