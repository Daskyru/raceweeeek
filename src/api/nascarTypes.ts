export interface NascarScheduleEvent {
  event_name: string
  notes?: string
  start_time_utc: string
  run_type: number
}

export interface NascarRaceListItem {
  race_id: number
  series_id: number
  race_season: number
  race_name: string
  race_type_id: number
  track_id: number
  track_name: string
  date_scheduled: string
  race_date: string
  qualifying_date: string
  winner_driver_id: number | null
  schedule: NascarScheduleEvent[]
}

export interface NascarRaceListBasic {
  series_1: NascarRaceListItem[]
  series_2?: NascarRaceListItem[]
  series_3?: NascarRaceListItem[]
}

export interface NascarWeekendRunResult {
  car_number: string
  vehicle_number?: string
  manufacturer?: string
  driver_id: number
  driver_name: string
  finishing_position: number
  best_lap_time?: number
  best_lap_speed?: number
  best_lap_number?: number
  laps_completed?: number
  disqualified?: boolean
  delta_leader?: number
  comment?: string
}

export interface NascarWeekendRun {
  weekend_run_id: number
  race_id: number
  run_type: number
  run_name: string
  run_date_utc: string
  results: NascarWeekendRunResult[]
}

export interface NascarRaceResultRow {
  finishing_position: number
  starting_position?: number
  car_number: string
  driver_fullname: string
  driver_id: number
  team_name: string
  owner_id: number
  owner_fullname: string
  qualifying_speed?: number
  laps_completed?: number
  finishing_status?: string
  points_earned?: number
  disqualified?: boolean
  diff_time?: number
  diff_laps?: number
}

export interface NascarWeekendRaceBlock {
  race_id: number
  /** Wall-clock race duration for the winner (e.g. `"3:20:41"`). */
  total_race_time?: string
  results: NascarRaceResultRow[]
}

export interface NascarWeekendFeed {
  weekend_race: NascarWeekendRaceBlock[]
  weekend_runs: NascarWeekendRun[]
}

export interface NascarStandingsDriverRow {
  driver_id: number
  driver_name: string
  team_name?: string
  car_number?: string
  position: number
  points: number
}

export interface NascarStandingsOwnerRow {
  owner_id: number
  owner_name: string
  position: number
  points: number
}

export interface NascarStandingsPayload {
  drivers?: NascarStandingsDriverRow[]
  owners?: NascarStandingsOwnerRow[]
}

/** Official season standings from `points-feed.json`. */
export interface NascarPointsFeedRow {
  position: number
  driver_name: string
  points: number
  driver_id: number
  car_no: string
  manufacturer?: string
}
