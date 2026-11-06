import { useEffect, useMemo, useState } from 'react'
import type { SessionUiKey } from '../api/types'
import { nascarCircuitPhotoUrl } from '../api/nascarCircuitPhotos'
import { Breadcrumbs } from '../components/Breadcrumbs/Breadcrumbs'
import { Card } from '../components/Card/Card'
import { CircuitMap } from '../components/CircuitMap/CircuitMap'
import { ErrorState } from '../components/ErrorState/ErrorState'
import { Layout } from '../components/Layout/Layout'
import { LoadingSkeleton, LoadingSpinner } from '../components/LoadingState/LoadingState'
import { MeetingSelect } from '../components/MeetingSelect/MeetingSelect'
import { PageTabs } from '../components/PageTabs/PageTabs'
import { RaceCalendar } from '../components/RaceCalendar/RaceCalendar'
import { SessionResultsPanel } from '../components/SessionResultsPanel/SessionResultsPanel'
import { SessionSchedule } from '../components/SessionSchedule/SessionSchedule'
import { StandingsTable } from '../components/StandingsTable/StandingsTable'
import {
  useNascarMeetings,
  useNascarSeasonYear,
  useNascarSessionResults,
  useNascarSessions,
  useNascarStandings,
} from '../hooks/useNascarData'
import { pickDefaultMeeting } from '../utils/meetings'
import {
  nascarAvailableSessionKeys,
  nascarDefaultSessionKey,
  nascarFindSessionByUiKey,
  nascarSessionStarted,
} from '../utils/nascarSessions'
import styles from './NascarPage.module.css'

export function NascarPage() {
  const { data: season } = useNascarSeasonYear()
  const calendarYear = new Date().getFullYear()
  const seasonYear = season ?? calendarYear

  const meetingsQuery = useNascarMeetings(seasonYear)
  const meetings = meetingsQuery.data ?? []

  const standingsQuery = useNascarStandings(
    seasonYear,
    meetingsQuery.isSuccess || meetings.length > 0,
  )

  const [meetingKey, setMeetingKey] = useState<number | null>(null)
  const [sessionKey, setSessionKey] = useState<SessionUiKey>('fp1')

  useEffect(() => {
    if (meetingKey != null && !meetings.some((m) => m.meeting_key === meetingKey)) {
      setMeetingKey(null)
    }
  }, [meetings, meetingKey])

  useEffect(() => {
    if (meetings.length && meetingKey == null) {
      const def = pickDefaultMeeting(meetings)
      if (def) setMeetingKey(def.meeting_key)
    }
  }, [meetings, meetingKey])

  const selectedMeeting = useMemo(
    () => meetings.find((m) => m.meeting_key === meetingKey) ?? null,
    [meetings, meetingKey],
  )

  const sessionsQuery = useNascarSessions(meetingKey, seasonYear)
  const sessions = sessionsQuery.data ?? []

  useEffect(() => {
    if (!sessions.length) return
    const available = nascarAvailableSessionKeys(sessions)
    if (!available.includes(sessionKey)) {
      setSessionKey(nascarDefaultSessionKey(sessions))
    }
  }, [sessions, sessionKey])

  const activeSession = nascarFindSessionByUiKey(sessions, sessionKey)
  const sessionStarted = activeSession ? nascarSessionStarted(activeSession) : false

  const resultsQuery = useNascarSessionResults(
    seasonYear,
    meetingKey,
    activeSession?.session_key ?? null,
    sessionStarted,
  )

  const schemeImageUrl = selectedMeeting
    ? nascarCircuitPhotoUrl(selectedMeeting.circuit_key, selectedMeeting.circuit_short_name)
    : null
  const standingsDrivers = standingsQuery.data?.drivers ?? []
  const standingsLoadingDrivers =
    standingsQuery.isLoading && standingsDrivers.length === 0

  return (
    <Layout>
      <Breadcrumbs
        items={[
          { label: 'RaceWEEEEK', to: '/' },
          { label: 'NASCAR Cup', white: true },
        ]}
      />
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>
          <span className={styles.titleNa}>NA</span>
          <span className={styles.titleSc}>SC</span>
          <span className={styles.titleAr}>AR</span>
          <span className={styles.titleCup}> Cup</span>
        </h1>
      </header>

      <PageTabs />

      <div id="standings">
        <Card title="Чемпионат">
          {standingsQuery.isError ? (
            <ErrorState />
          ) : (
            <>
              {standingsQuery.data && !standingsQuery.data.fromOfficialFeed ? (
                <p
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Зачёт по сумме очков за гонки (points-feed недоступен).
                </p>
              ) : null}
              <StandingsTable
                variant="nascar"
                drivers={standingsDrivers}
                teams={[]}
                hasSeasonRaces={
                  standingsDrivers.length > 0 || standingsLoadingDrivers
                }
                isLoadingDrivers={standingsLoadingDrivers}
                isLoadingTeams={false}
              />
            </>
          )}
        </Card>
      </div>

      <div id="calendar">
        <Card title="Календарь гонок">
          {meetingsQuery.isLoading && meetings.length === 0 ? (
            <LoadingSpinner variant="f1" />
          ) : meetingsQuery.isError && meetings.length === 0 ? (
            <ErrorState />
          ) : (
            <RaceCalendar meetings={meetings} />
          )}
        </Card>
      </div>

      <div id="stage">
        <Card title="Расписание этапа">
          <MeetingSelect
            label="Этап"
            selectId="nascar-stage-select"
            meetings={meetings}
            value={meetingKey}
            onChange={setMeetingKey}
            embedded
            formatOption={(m) =>
              `R${m.seasonRound ?? '?'} · ${m.meeting_name} — ${m.location}`
            }
          />
          {sessionsQuery.isLoading ||
          (sessionsQuery.isFetching && sessions.length === 0) ? (
            <LoadingSpinner variant="f1" />
          ) : sessionsQuery.isError ? (
            <ErrorState />
          ) : (
            <SessionSchedule sessions={sessions} />
          )}
        </Card>

        <Card title="Схема трассы">
          {!selectedMeeting ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <CircuitMap
              schemeImageUrl={schemeImageUrl}
              circuit={undefined}
              circuitImage={undefined}
              circuitTitle={selectedMeeting.circuit_short_name}
              locationLabel={selectedMeeting.location}
              sectorTimes={undefined}
              darkWrap
            />
          )}
        </Card>
      </div>

      <div id="results">
        <Card title="Результаты сессий">
          {sessionsQuery.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <SessionResultsPanel
              variant="nascar"
              sessions={sessions}
              activeKey={sessionKey}
              onSelectKey={setSessionKey}
              rows={resultsQuery.data}
              isLoading={resultsQuery.isLoading}
              isFetching={resultsQuery.isFetching}
              isError={resultsQuery.isError}
            />
          )}
        </Card>
      </div>
    </Layout>
  )
}
