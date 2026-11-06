import type { Meeting } from './types'
import { fetchEvent, fetchEvents } from './openwecClient'
import { mapEventToMeeting } from './gt3Mappers'

export async function loadGt3MeetingsWithDates(year: number): Promise<Meeting[]> {
  const events = await fetchEvents(year)
  const batchSize = 4
  const meetings: Meeting[] = []

  for (let i = 0; i < events.length; i += batchSize) {
    const chunk = events.slice(i, i + batchSize)
    const details = await Promise.all(
      chunk.map(async (ev) => {
        try {
          return await fetchEvent(ev.id)
        } catch {
          await new Promise((r) => setTimeout(r, 400))
          try {
            return await fetchEvent(ev.id)
          } catch {
            return null
          }
        }
      }),
    )
    chunk.forEach((ev, j) => {
      meetings.push(mapEventToMeeting(ev, details[j], year))
    })
  }

  return meetings.sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
  )
}
