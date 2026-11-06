import { useState } from 'react'
import { DataTable } from '../DataTable/DataTable'
import tableStyles from '../DataTable/DataTable.module.css'
import { EmptyState } from '../ErrorState/ErrorState'
import { LoadingSpinner } from '../LoadingState/LoadingState'
import styles from './StandingsTable.module.css'

interface DriverRow {
  id?: string
  position: number
  driverNumber: number
  name: string
  team: string
  points: number
}

interface TeamRow {
  position: number
  name: string
  points: number
}

export function StandingsTable({
  drivers,
  teams,
  hasSeasonRaces,
  isLoadingDrivers = false,
  isLoadingTeams = false,
  variant = 'f1',
}: {
  drivers: DriverRow[]
  teams: TeamRow[]
  hasSeasonRaces: boolean
  isLoadingDrivers?: boolean
  isLoadingTeams?: boolean
  variant?: 'f1' | 'gt3' | 'nascar'
}) {
  const [tab, setTab] = useState<'drivers' | 'constructors'>('drivers')
  const driverVariant = variant === 'nascar' ? 'f1' : variant

  if (!hasSeasonRaces && !isLoadingDrivers && !isLoadingTeams) {
    return <EmptyState message="Зачёт появится после первой гонки сезона" />
  }

  if (variant === 'nascar') {
    return isLoadingDrivers && drivers.length === 0 ? (
      <LoadingSpinner variant="f1" />
    ) : drivers.length === 0 ? (
      <EmptyState message="Не удалось загрузить личный зачёт." />
    ) : (
      <DataTable
        rows={drivers}
        rowKey={(r) => r.driverNumber}
        tableClassName={styles.standingsTable}
        columns={[
          {
            key: 'pos',
            header: 'Поз.',
            className: tableStyles.pos,
            render: (r) => r.position,
          },
          {
            key: 'driver',
            header: 'Гонщик',
            render: (r) => `${r.name} (#${r.driverNumber})`,
          },
          { key: 'pts', header: 'Очки', render: (r) => r.points },
        ]}
      />
    )
  }

  return (
    <>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'drivers'}
          className={tab === 'drivers' ? styles.tabActive : styles.tab}
          onClick={() => setTab('drivers')}
        >
          Личный зачёт
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'constructors'}
          className={tab === 'constructors' ? styles.tabActive : styles.tab}
          onClick={() => setTab('constructors')}
        >
          {driverVariant === 'gt3' ? 'Зачёт машин' : 'Командный зачёт'}
        </button>
      </div>
      {tab === 'drivers' ? (
        isLoadingDrivers && drivers.length === 0 ? (
          <LoadingSpinner variant="f1" />
        ) : drivers.length === 0 ? (
          <EmptyState message="Не удалось загрузить личный зачёт." />
        ) : (
          <DataTable
            rows={drivers}
            rowKey={(r) =>
              driverVariant === 'gt3' && r.id != null ? r.id : r.driverNumber
            }
            tableClassName={styles.standingsTable}
            columns={[
              {
                key: 'pos',
                header: 'Поз.',
                className: tableStyles.pos,
                render: (r) => r.position,
              },
              {
                key: 'driver',
                header: 'Гонщик',
                render: (r) =>
                  driverVariant === 'gt3' ? r.name : `${r.name} (#${r.driverNumber})`,
              },
              ...(driverVariant === 'gt3'
                ? [
                    {
                      key: 'car',
                      header: 'Борт',
                      className: tableStyles.pos,
                      render: (r: DriverRow) =>
                        r.driverNumber > 0 ? `#${r.driverNumber}` : '—',
                    },
                    {
                      key: 'team',
                      header: 'Команда',
                      render: (r: DriverRow) => r.team,
                    },
                  ]
                : []),
              { key: 'pts', header: 'Очки', render: (r) => r.points },
            ]}
          />
        )
      ) : isLoadingTeams && teams.length === 0 ? (
        <LoadingSpinner variant="f1" />
      ) : teams.length === 0 ? (
        <EmptyState message="Загрузка командного зачёта…" />
      ) : (
        <DataTable
          rows={teams}
          rowKey={(r) => r.name}
          tableClassName={styles.standingsTable}
          columns={[
            {
              key: 'pos',
              header: 'Позиция',
              className: tableStyles.pos,
              render: (r) => r.position,
            },
            {
              key: 'name',
              header: driverVariant === 'gt3' ? 'Машина / команда' : 'Команда',
              render: (r) => r.name,
            },
            { key: 'pts', header: 'Очки', render: (r) => r.points },
          ]}
        />
      )}
    </>
  )
}
