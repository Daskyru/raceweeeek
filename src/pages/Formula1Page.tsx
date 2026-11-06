import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SessionUiKey } from '../api/types'
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
  useCircuit,
  useMeetings,
  useSeasonYear,
  useSectorTimes,
  useSessionResults,
  useSessions,
  useStandings,
} from '../hooks/useF1Data'
import { hasEmptyTeamStandings } from '../api/standingsLoader'
import { hasPlaceholderDriverNames } from '../utils/driverStandingsOverrides'
import { pickDefaultMeeting, raceSchemeImageUrl } from '../utils/meetings'
import {
  availableSessionKeys,
  findSessionByUiKey,
  isSessionNotStarted,
} from '../utils/sessions'
import styles from './Formula1Page.module.css'

export function Formula1Page() {
  const queryClient = useQueryClient()
  const standingsRefetchAttempts = useRef(0)
  const { data: season } = useSeasonYear()
  const calendarYear = new Date().getFullYear()
  const seasonYear = season ?? calendarYear
  const meetingsQuery = useMeetings(seasonYear)
  const standingsQuery = useStandings(seasonYear)

  const standingsDrivers = standingsQuery.data?.drivers ?? []
  const standingsTeams = standingsQuery.data?.teams ?? []
  const standingsHasPlaceholders =
    standingsQuery.isSuccess && hasPlaceholderDriverNames(standingsDrivers)
  const standingsHasEmptyTeams =
    standingsQuery.isSuccess && hasEmptyTeamStandings(standingsDrivers, standingsTeams)
  const standingsNeedsRetry = standingsHasPlaceholders || standingsHasEmptyTeams
  const standingsLoadingDrivers =
    standingsQuery.isLoading && standingsDrivers.length === 0
  const standingsLoadingTeams =
    standingsQuery.isLoading && standingsTeams.length === 0

  useEffect(() => {
    if (!standingsNeedsRetry) {
      standingsRefetchAttempts.current = 0
      return
    }
    if (standingsQuery.isFetching || standingsRefetchAttempts.current >= 3) return
    standingsRefetchAttempts.current += 1
    void queryClient.invalidateQueries({ queryKey: ['standings', seasonYear] })
  }, [standingsNeedsRetry, standingsQuery.isFetching, seasonYear, queryClient])

  const meetings = meetingsQuery.data ?? []
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

  const sessionsQuery = useSessions(meetingKey)
  const sessions = sessionsQuery.data ?? []

  useEffect(() => {
    if (!sessions.length) return
    const available = availableSessionKeys(sessions)
    if (!available.includes(sessionKey) && available[0]) {
      setSessionKey(available[0])
    }
  }, [sessions, sessionKey])

  const activeSession = findSessionByUiKey(sessions, sessionKey)
  const sessionStarted = activeSession ? !isSessionNotStarted(activeSession) : false

  const resultsQuery = useSessionResults(
    activeSession?.session_key ?? null,
    activeSession?.session_name,
    sessionStarted,
  )

  const schemeImageUrl = selectedMeeting?.seasonRound
    ? raceSchemeImageUrl(selectedMeeting.seasonRound)
    : null

  const circuitQuery = useCircuit(
    schemeImageUrl ? undefined : selectedMeeting?.circuit_info_url,
  )
  const qualSession =
    findSessionByUiKey(sessions, 'qualifying') ?? findSessionByUiKey(sessions, 'fp1')
  const sectorQuery = useSectorTimes(schemeImageUrl ? null : qualSession?.session_key)

  return (
    <Layout>
      <Breadcrumbs
        items={[
          { label: 'RaceWEEEEK', to: '/' },
          { label: 'Formula 1', f1Red: true },
        ]}
      />
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Formula 1</h1>
      </header>

      <PageTabs />

      <div id="standings">
        <Card title="Чемпионат">
          {standingsQuery.isError ? (
            <ErrorState />
          ) : (
            <StandingsTable
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
            <RaceCalendar meetings={meetings} />
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
            <LoadingSkeleton rows={6} />
          ) : !schemeImageUrl && circuitQuery.isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <CircuitMap
              schemeImageUrl={schemeImageUrl}
              circuit={circuitQuery.data}
              circuitImage={selectedMeeting.circuit_image}
              circuitTitle={selectedMeeting.circuit_short_name}
              locationLabel={selectedMeeting.location}
              sectorTimes={sectorQuery.data}
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
