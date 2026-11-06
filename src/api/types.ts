export interface Meeting {
  meeting_key: number
  /** Порядковый номер этапа в календаре (1, 2, 3…) после фильтрации. */
  seasonRound?: number
  meeting_name: string
  meeting_official_name: string
  location: string
  country_name: string
  country_code: string
  circuit_key: number
  circuit_short_name: string
  circuit_info_url: string
  circuit_image: string
  date_start: string
  date_end: string
  year: number
  is_cancelled: boolean
}

export interface Session {
  session_key: number
  meeting_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  circuit_short_name: string
  country_name: string
  year: number
  is_cancelled: boolean
}

export interface Driver {
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  session_key: number
}

export interface SessionResult {
  session_key: number
  meeting_key: number
  driver_number: number
  position: number | null
  duration: number | number[] | null
  gap_to_leader?: number | string | (number | string)[] | null
  number_of_laps: number
  dnf: boolean
  dns: boolean
  dsq: boolean
}

export interface Stint {
  session_key: number
  driver_number: number
  stint_number: number
  compound: string
  lap_start: number
  lap_end: number
}

export interface Pit {
  session_key: number
  driver_number: number
  lap_number: number
}

export interface Lap {
  session_key: number
  driver_number: number
  lap_number: number
  lap_duration: number | null
  duration_sector_1: number | null
  duration_sector_2: number | null
  duration_sector_3: number | null
  is_pit_out_lap: boolean
  /** 1, 2, or 3 during qualifying sessions (OpenF1). */
  qualifying_phase?: number | null
}

export interface ChampionshipDriver {
  session_key: number
  driver_number: number
  position_current: number
  position_start: number
  points_current: number
  points_start: number
}

export interface ChampionshipTeam {
  session_key: number
  team_name: string
  position_current: number
  position_start: number
  points_current: number
  points_start: number
}

export interface CircuitCorner {
  number: number
  trackPosition: { x: number; y: number }
  length?: number
}

export interface CircuitInfo {
  circuitKey: number
  circuitName: string
  location?: string
  x: number[]
  y: number[]
  miniSectorsIndexes: number[]
  corners?: CircuitCorner[]
  rotation?: number
}

export type SessionUiKey =
  | 'fp1'
  | 'fp2'
  | 'fp3'
  | 'sprint-qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race'

export type MeetingStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'

export interface ResultRow {
  position: number
  driverNumber: number
  driverName: string
  teamName: string
  bestTime: string
  q1?: string
  q2?: string
  q3?: string
  laps: number
  pitStops?: number
  status?: 'DNF' | 'DNS' | 'DSQ' | null
  /** LMGT3 race: WEC points for this car in the session (0 if none). */
  sessionPoints?: number | null
}
