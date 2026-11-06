import { useEffect, useMemo, useState } from 'react'
import type { SessionUiKey } from '../api/types'
import { gt3CircuitPhotoUrl } from '../api/gt3CircuitPhotos'
import { HYPERCAR_SEASON_YEAR, HYPERCAR_WEC_FULL_ROUNDS } from '../api/hypercarConfig'
import { Breadcrumbs } from '../components/Breadcrumbs/Breadcrumbs'
import { Card } from '../components/Card/Card'
import { CircuitMap } from '../components/CircuitMap/CircuitMap'
import { EmptyState, ErrorState } from '../components/ErrorState/ErrorState'
import { Layout } from '../components/Layout/Layout'
import { LoadingSkeleton, LoadingSpinner } from '../components/LoadingState/LoadingState'
import { MeetingSelect } from '../components/MeetingSelect/MeetingSelect'
import { PageTabs } from '../components/PageTabs/PageTabs'
import { RaceCalendar } from '../components/RaceCalendar/RaceCalendar'
import { SessionResultsPanel } from '../components/SessionResultsPanel/SessionResultsPanel'
import { SessionSchedule } from '../components/SessionSchedule/SessionSchedule'
import { StandingsTable } from '../components/StandingsTable/StandingsTable'
import {
  useHypercarEventSessions,
  useHypercarMeetings,
  useHypercarSessionResults,
  useHypercarStandings,
} from '../hooks/useHypercarData'
import { pickDefaultMeeting } from '../utils/meetings'
import {
  gt3AvailableSessionKeys,
  gt3DefaultSessionKey,
  gt3FindSessionByUiKey,
  gt3SessionStarted,
} from '../utils/gt3Sessions'
import styles from './Gt3Page.module.css'

export function HypercarPage() {
  const seasonYear = HYPERCAR_SEASON_YEAR

  const meetingsQuery = useHypercarMeetings(seasonYear)
  const meetings = meetingsQuery.data ?? []
  const standingsQuery = useHypercarStandings(
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

  const circuitPhotoUrl = gt3CircuitPhotoUrl(selectedMeeting?.seasonRound)

  const sessionsQuery = useHypercarEventSessions(meetingKey, seasonYear)
  const sessions = sessionsQuery.data ?? []

  useEffect(() => {
    if (!sessions.length) return
    const available = gt3AvailableSessionKeys(sessions)
    if (!available.includes(sessionKey)) {
      setSessionKey(gt3DefaultSessionKey(sessions))
    }
  }, [sessions, sessionKey])

  const activeSession = gt3FindSessionByUiKey(sessions, sessionKey)
  const raceSession = gt3FindSessionByUiKey(sessions, 'race')
  const sessionStarted = activeSession ? gt3SessionStarted(activeSession) : false

  const isRaceSession = sessionKey === 'race' || activeSession?.session_type === 'Race'

  const resultsQuery = useHypercarSessionResults(
    sessionStarted && activeSession ? activeSession.session_key : null,
    raceSession?.session_key ?? null,
    isRaceSession,
  )

  const standingsDrivers = standingsQuery.data?.drivers ?? []
  const standingsTeams = standingsQuery.data?.teams ?? []
  const standingsLoadingDrivers =
    standingsQuery.isLoading && standingsDrivers.length === 0
  const standingsLoadingTeams =
    standingsQuery.isLoading && standingsTeams.length === 0

  return (
    <Layout>
      <Breadcrumbs
        items={[
          { label: 'RaceWEEEEK', to: '/' },
          { label: 'WEC Hypercar', f1Red: true },
        ]}
      />
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Hypercar</h1>
        <p className={styles.subtitle}>WEC Hypercar · сезон {seasonYear}</p>
      </header>

      <PageTabs />

      <div id="standings">
        <Card title="Чемпионат">
          {standingsQuery.isError ? (
            <ErrorState />
          ) : (
            <StandingsTable
              variant="gt3"
              drivers={standingsDrivers}
              teams={standingsTeams}
              hasSeasonRaces={
                standingsDrivers.length > 0 ||
                standingsTeams.length > 0 ||
                standingsLoadingDrivers ||
                standingsLoadingTeams
              }
              isLoadingDrivers={standingsLoadingDrivers}
              isLoadingTeams={standingsLoadingTeams}
            />
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
            <>
              {meetings.length > 0 && meetings.length < HYPERCAR_WEC_FULL_ROUNDS ? (
                <p className={styles.seasonNote}>
                  Доступно {meetings.length} из {HYPERCAR_WEC_FULL_ROUNDS} этапов.
                </p>
              ) : null}
              <RaceCalendar meetings={meetings} />
            </>
          )}
        </Card>
      </div>

      <div id="stage">
        <Card title="Расписание этапа">
          <MeetingSelect
            meetings={meetings}
            value={meetingKey}
            onChange={setMeetingKey}
            embedded
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
            <EmptyState message="Выберите этап." />
          ) : circuitPhotoUrl ? (
            <CircuitMap
              schemeImageUrl={circuitPhotoUrl}
              circuitTitle={selectedMeeting.circuit_short_name}
              locationLabel={selectedMeeting.country_name}
            />
          ) : (
            <EmptyState message="Фото недоступно для этого этапа." />
          )}
        </Card>
      </div>

      <div id="results">
        <Card title="Результаты сессий (Hypercar)">
          {sessionsQuery.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <SessionResultsPanel
              variant="gt3"
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
