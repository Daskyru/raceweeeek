import { useMemo } from 'react'
import type { Session } from '../../api/types'
import type { SessionUiKey } from '../../api/types'
import type { ResultRow } from '../../api/types'
import {
  ALL_SESSION_KEYS,
  SESSION_UI_LABELS,
  availableSessionKeys,
  findSessionByUiKey,
  isSessionNotStarted,
} from '../../utils/sessions'
import { gt3AvailableSessionKeys, gt3FindSessionByUiKey } from '../../utils/gt3Sessions'
import { DataTable } from '../DataTable/DataTable'
import type { DataTableColumn } from '../DataTable/DataTable'
import { EmptyState } from '../ErrorState/ErrorState'
import { LoadingSpinner } from '../LoadingState/LoadingState'
import tableStyles from '../DataTable/DataTable.module.css'
import styles from './SessionResultsPanel.module.css'

const RESULT_STATUS_LABELS = new Set(['DNF', 'DNS', 'DSQ'])

function isResultStatusText(text: string): boolean {
  return RESULT_STATUS_LABELS.has(text)
}

function shouldHighlightResultStatus(r: ResultRow, displayText: string): boolean {
  return isResultStatusText(displayText) || (r.status != null && displayText === r.status)
}

function qualSegmentDisplay(r: ResultRow, segment: 'q1' | 'q2' | 'q3'): string {
  if (r.status != null && isResultStatusText(r.status)) return r.status
  const raw = r[segment] ?? '—'
  if (isResultStatusText(raw)) return raw
  if (raw !== '—') return raw
  if (segment === 'q2') return 'Выбыл в Q1'
  if (segment === 'q3') {
    const q2Raw = r.q2 ?? '—'
    if (q2Raw === '—') return 'Выбыл в Q1'
    return 'Выбыл в Q2'
  }
  return raw
}

function renderQualSegment(r: ResultRow, segment: 'q1' | 'q2' | 'q3') {
  const value = qualSegmentDisplay(r, segment)
  const highlight = shouldHighlightResultStatus(r, value)
  const eliminated = value.startsWith('Выбыл')
  return (
    <span
      className={
        highlight ? tableStyles.dnf : eliminated ? styles.qualEliminated : undefined
      }
    >
      {value}
    </span>
  )
}

export function SessionResultsPanel({
  sessions,
  activeKey,
  onSelectKey,
  rows,
  isLoading,
  isFetching,
  isError,
  variant = 'f1',
}: {
  sessions: Session[]
  activeKey: SessionUiKey
  onSelectKey: (key: SessionUiKey) => void
  rows: ResultRow[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  variant?: 'f1' | 'gt3'
}) {
  const available =
    variant === 'gt3' ? gt3AvailableSessionKeys(sessions) : availableSessionKeys(sessions)
  const activeSession =
    variant === 'gt3'
      ? gt3FindSessionByUiKey(sessions, activeKey)
      : findSessionByUiKey(sessions, activeKey)
  const notStarted = activeSession ? isSessionNotStarted(activeSession) : true
  const hasRows = (rows?.length ?? 0) > 0
  const showResultsSpinner = isLoading || (isFetching && !hasRows)
  const showResultsTable = hasRows && !showResultsSpinner

  const columns = useMemo((): DataTableColumn<ResultRow>[] => {
    const base: DataTableColumn<ResultRow>[] = [
      {
        key: 'pos',
        header: 'Позиция',
        className: tableStyles.pos,
        render: (r) => r.position,
      },
      {
        key: 'driver',
        header: 'Гонщик',
        render: (r) =>
          variant === 'gt3' ? r.driverName : `${r.driverName} (#${r.driverNumber})`,
      },
      { key: 'team', header: 'Команда', render: (r) => r.teamName },
    ]

    if (
      variant === 'f1' &&
      (activeKey === 'qualifying' || activeKey === 'sprint-qualifying')
    ) {
      return [
        ...base,
        { key: 'q1', header: 'Q1', render: (r) => renderQualSegment(r, 'q1') },
        { key: 'q2', header: 'Q2', render: (r) => renderQualSegment(r, 'q2') },
        { key: 'q3', header: 'Q3', render: (r) => renderQualSegment(r, 'q3') },
        { key: 'laps', header: 'Круги', render: (r) => r.laps },
      ]
    }

    const timeHeader =
      variant === 'gt3' && activeKey === 'race' ? 'Результат' : 'Лучшее время'

    const timeAndLaps: DataTableColumn<ResultRow>[] = [
      {
        key: 'time',
        header: timeHeader,
        render: (r) => {
          const display = r.status ?? r.bestTime
          const highlight = shouldHighlightResultStatus(r, display)
          return (
            <span className={highlight ? tableStyles.dnf : undefined}>
              {display}
            </span>
          )
        },
      },
      { key: 'laps', header: 'Круги', render: (r) => r.laps },
    ]

    if (activeKey === 'race' && variant === 'gt3') {
      return [
        ...base,
        ...timeAndLaps,
        {
          key: 'pts',
          header: 'Очки',
          className: tableStyles.pos,
          render: (r) =>
            r.sessionPoints != null ? r.sessionPoints : '—',
        },
      ]
    }

    if (activeKey === 'race' && variant === 'f1') {
      return [
        ...base,
        ...timeAndLaps,
        { key: 'pits', header: 'Питы', render: (r) => r.pitStops ?? 0 },
      ]
    }

    return [...base, ...timeAndLaps]
  }, [activeKey, variant])

  return (
    <>
      <div className={styles.tabs} role="tablist">
        {ALL_SESSION_KEYS.filter(
          (key) => variant === 'f1' || (key !== 'sprint' && key !== 'sprint-qualifying'),
        ).map((key) => {
          const inWeekend = available.includes(key)
          const isActive = key === activeKey
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!inWeekend}
              className={
                !inWeekend
                  ? styles.tabDisabled
                  : isActive
                    ? styles.tabActive
                    : styles.tab
              }
              onClick={() => inWeekend && onSelectKey(key)}
              title={!inWeekend ? 'N/A' : undefined}
            >
              {SESSION_UI_LABELS[key]}
            </button>
          )
        })}
      </div>
      {showResultsTable ? (
        <DataTable
          rows={rows!}
          rowKey={(r) =>
            variant === 'gt3'
              ? `${r.driverNumber}-${r.teamName}`
              : r.driverNumber
          }
          columns={columns}
        />
      ) : showResultsSpinner ? (
        <LoadingSpinner variant="f1" />
      ) : notStarted ? (
        <EmptyState message="Данные появятся после начала сессии" />
      ) : isError ? (
        <EmptyState message="Не удалось загрузить результаты. Обновите страницу." />
      ) : (
        <EmptyState message="Результаты ещё не опубликованы — обновление каждые 15 с" />
      )}
    </>
  )
}
