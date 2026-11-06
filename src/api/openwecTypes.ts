export interface OpenWecSeries {
  id: number
  key: string
  name: string
}

export interface OpenWecSeason {
  id: number
  raw_id: string
  year: number
  label: string
}

export interface OpenWecEventListItem {
  id: number
  raw_id: string
  name: string
  round: number | null
}

export interface OpenWecSession {
  id: number
  name: string
  session_type: string
  session_at: string | null
  imsa_series: string | null
  snapshot_hour: number | null
}

export interface OpenWecEventDetail {
  id: number
  series: string
  season: string
  name: string
  round: number
  sessions: OpenWecSession[]
}

export interface OpenWecResultDriver {
  id: number
  slot: number
  first_name: string
  last_name: string
  country: string | null
  imsa_rating: string | null
}

export interface OpenWecLap {
  car_number: string
  driver_name: string
  lap_number: number
  lap_time_s: number
  crossing_finish_in_pit: boolean
  pit_time_s: number | null
  flag_at_fl: string | null
}

export interface OpenWecSessionResult {
  position: number | null
  car_number: string
  car_class: string
  vehicle: string
  team: string
  tyre_supplier: string | null
  status: string
  laps_completed: number
  total_time_s: number | null
  gap_to_first_s: number | null
  fl_lap_number: number | null
  fl_time_s: number | null
  fl_kph: number | null
  drivers: OpenWecResultDriver[]
}
