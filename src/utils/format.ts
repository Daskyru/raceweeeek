const lapTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const localFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const utcFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

export function formatSingleLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—'

  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = (seconds % 60).toFixed(3).padStart(6, '0')
    return `${h}:${String(m).padStart(2, '0')}:${s}`
  }

  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

export function formatLapTime(duration: number | number[] | null | undefined): string {
  if (duration == null) return '—'
  if (Array.isArray(duration)) {
    const valid = duration.filter((d) => typeof d === 'number' && d > 0)
    if (valid.length === 0) return '—'
    return formatSingleLapTime(Math.min(...valid))
  }
  return formatSingleLapTime(duration)
}

export type QualifyingSegmentTimes = { q1: string; q2: string; q3: string }

export function formatQualifyingSegmentTimes(
  duration: number | number[] | null | undefined,
): QualifyingSegmentTimes {
  const seconds: (number | null)[] = [null, null, null]
  if (Array.isArray(duration)) {
    for (let i = 0; i < 3; i++) {
      const v = duration[i]
      seconds[i] = typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
    }
  }
  return {
    q1: formatSingleLapTime(seconds[0]),
    q2: formatSingleLapTime(seconds[1]),
    q3: formatSingleLapTime(seconds[2]),
  }
}

/** Local start/end for race weekend cards (date + time). */
export function formatMeetingWindow(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toUTCString().slice(0, 11) === e.toUTCString().slice(0, 11)
  if (sameDay) {
    const datePart = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(s)
    const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeStyle: 'short' })
    return `${datePart}, ${timeFmt.format(s)} – ${timeFmt.format(e)}`
  }
  return `${localFormatter.format(s)} – ${localFormatter.format(e)}`
}

/** Compact date/time for race calendar cards. */
export function formatMeetingWindowCompact(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toUTCString().slice(0, 11) === e.toUTCString().slice(0, 11)
  const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
  const timeFmt = new Intl.DateTimeFormat('ru-RU', { timeStyle: 'short' })
  if (sameDay) {
    return `${dateFmt.format(s)}, ${timeFmt.format(s)}–${timeFmt.format(e)}`
  }
  return `${dateFmt.format(s)} ${timeFmt.format(s)} – ${dateFmt.format(e)} ${timeFmt.format(e)}`
}

const weekendDateFmt = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' })

/** Race weekend start/end dates only (no time), for calendar cards. */
export function formatMeetingWeekendDates(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toUTCString().slice(0, 11) === e.toUTCString().slice(0, 11)
  if (sameDay) return weekendDateFmt.format(s)
  return `${weekendDateFmt.format(s)} – ${weekendDateFmt.format(e)}`
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toUTCString().slice(0, 11) === e.toUTCString().slice(0, 11)
  if (sameDay) {
    return localFormatter.format(s)
  }
  return `${localFormatter.format(s)} – ${localFormatter.format(e)}`
}

export function formatSessionTime(iso: string): { local: string; utc: string } {
  const d = new Date(iso)
  return {
    local: localFormatter.format(d),
    utc: `${utcFormatter.format(d)} UTC`,
  }
}

export function formatSectorTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  return seconds.toFixed(3)
}

export { lapTimeFormatter }
