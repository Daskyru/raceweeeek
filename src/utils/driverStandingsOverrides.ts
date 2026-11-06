export interface DriverStandingRow {
  position: number
  driverNumber: number
  name: string
  team: string
  points: number
}

export type DriverStandingDisplayRow = DriverStandingRow

export function isDriverNamePlaceholder(name: string, driverNumber: number): boolean {
  return name === `#${driverNumber}` || name.startsWith('#')
}

export function hasPlaceholderDriverNames(rows: DriverStandingRow[]): boolean {
  return rows.some((r) => isDriverNamePlaceholder(r.name, r.driverNumber))
}

const NUMBER_NAME: Record<number, string> = {
  31: 'Esteban OCON',
  22: 'Yuki TSUNODA',
}

const NUMBER_TEAM: Record<number, string> = {
  31: 'Haas F1 Team',
  22: 'Racing Bulls',
}

const POSITION_BY_NAME: { match: RegExp; position: number; displayName: string }[] = [
  { match: /hirakawa/i, position: 21, displayName: 'Ryo HIRAKAWA' },
  { match: /stroll/i, position: 23, displayName: 'Lance STROLL' },
  { match: /bottas/i, position: 23, displayName: 'Valtteri BOTTAS' },
]

function normalizeName(name: string): string {
  return name.trim()
}

export function applyDriverStandingsOverrides(
  rows: DriverStandingRow[],
): DriverStandingDisplayRow[] {
  const updated = rows.map((row) => {
    let { name, position, driverNumber, team } = row

    if (NUMBER_NAME[driverNumber]) {
      name = NUMBER_NAME[driverNumber]
    }
    if (NUMBER_TEAM[driverNumber]) {
      team = NUMBER_TEAM[driverNumber]
    }

    for (const rule of POSITION_BY_NAME) {
      if (rule.match.test(name) || rule.match.test(row.name)) {
        name = rule.displayName
        position = rule.position
        break
      }
    }

    return { ...row, name: normalizeName(name), position, team }
  })

  updated.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    return b.points - a.points
  })

  return updated
}
