type OverrideStatus = 'DNF' | 'DNS' | 'DSQ'

/** OpenF1 API quirks: session_key + driver_number → status when heuristics miss. */
const OVERRIDES = new Map<string, OverrideStatus>([
  // 2026 Miami Sprint Qualifying — no session_result row; Lance Stroll DNF
  ['11271:18', 'DNF'],
])

function overrideKey(sessionKey: number, driverNumber: number): string {
  return `${sessionKey}:${driverNumber}`
}

export function sessionResultStatusOverride(
  sessionKey: number,
  driverNumber: number,
): OverrideStatus | undefined {
  return OVERRIDES.get(overrideKey(sessionKey, driverNumber))
}
