import styles from './ErrorState.module.css'

export function ErrorState({
  message = 'Не удалось загрузить данные. Проверьте интернет и попробуйте позже.',
}: {
  message?: string
}) {
  return (
    <div className={styles.box} role="alert">
      {message}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className={styles.empty}>{message}</p>
}
