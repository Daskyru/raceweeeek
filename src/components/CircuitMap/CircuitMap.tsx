import { useEffect, useMemo, useState } from 'react'
import type { CircuitInfo } from '../../api/types'
import {
  PIT_LANE_COLOR,
  SM_ZONE_COLOR,
  TRACK_BASE_COLOR,
  SECTOR_COLORS,
  buildPitLanePath,
  buildSectorPaths,
  buildSmZoneSegments,
  computeViewBox,
  flipY,
  getSectorSplitIndices,
  labelOffsetOutsideTrack,
  mirrorXCoords,
  pointsToPath,
} from '../../utils/circuitGeometry'
import { formatSectorTime } from '../../utils/format'
import styles from './CircuitMap.module.css'

const STROKE_MAIN = 320
const STROKE_SM = 160
const STROKE_PIT = 130
const CORNER_FONT = 200
const SECTOR_FONT = 240
const CORNER_GAP = 200
const SECTOR_GAP = 280
const LABEL_VIEW_PAD = 380

function mirrorCorners(
  corners: CircuitInfo['corners'],
  xMirrored: number[],
  xOrig: number[],
  yOrig: number[],
) {
  if (!corners?.length) return corners
  return corners.map((c) => {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < xOrig.length; i++) {
      const d = Math.hypot(
        xOrig[i] - c.trackPosition.x,
        yOrig[i] - c.trackPosition.y,
      )
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return {
      ...c,
      trackPosition: {
        x: xMirrored[best] ?? c.trackPosition.x,
        y: c.trackPosition.y,
      },
    }
  })
}

function CircuitHeader({
  displayLocation,
  displayName,
}: {
  displayLocation: string
  displayName: string
}) {
  return (
    <div className={styles.header}>
      <h3 className={styles.title}>Circuit Information</h3>
      <p className={styles.subtitle}>{displayLocation}</p>
      <p className={styles.circuitName}>{displayName}</p>
    </div>
  )
}

export function CircuitMap({
  circuit,
  circuitImage,
  schemeImageUrl,
  circuitTitle,
  locationLabel,
  sectorTimes,
  darkWrap = false,
}: {
  circuit?: CircuitInfo | undefined
  circuitImage?: string
  /** Local PNG from /Race/{round}.png — preferred over SVG trace. */
  schemeImageUrl?: string | null
  circuitTitle?: string
  locationLabel?: string
  sectorTimes?: { s1: number | null; s2: number | null; s3: number | null } | null
  /** Black panel behind circuit scheme (F1 /Race PNGs). */
  darkWrap?: boolean
}) {
  const [hoveredSector, setHoveredSector] = useState<number | null>(null)
  const [schemeImageError, setSchemeImageError] = useState(false)

  useEffect(() => {
    setSchemeImageError(false)
  }, [schemeImageUrl])

  const layout = useMemo(() => {
    if (!circuit?.x?.length) return null

    const x = mirrorXCoords(circuit.x)
    const y = circuit.y
    const mini = circuit.miniSectorsIndexes ?? []
    const corners = mirrorCorners(circuit.corners, x, circuit.x, y)

    return {
      x,
      y,
      mini,
      corners,
      fullPath: pointsToPath(x, y, 0, x.length - 1),
      sectorPaths: buildSectorPaths(x, y, mini),
      pitLanePath: buildPitLanePath(x, y),
      smZones: buildSmZoneSegments(x, y),
      viewBox: computeViewBox(x, y, STROKE_MAIN + 80, LABEL_VIEW_PAD),
    }
  }, [circuit])

  const sectorLabels = useMemo(() => {
    if (!layout) return []
    const split = getSectorSplitIndices(layout.x.length, layout.mini)
    return [1, 2, 3].map((sector, idx) => {
      const start = split[idx]
      const end = split[idx + 1]
      const mid = Math.floor((start + end) / 2)
      const pos = labelOffsetOutsideTrack(
        layout.x,
        layout.y,
        mid,
        STROKE_MAIN,
        SECTOR_GAP,
      )
      return { sector, ...pos }
    })
  }, [layout])

  const cornerLabels = useMemo(() => {
    if (!layout?.corners?.length) return []
    return layout.corners.map((corner) => {
      let nearest = 0
      let best = Infinity
      for (let i = 0; i < layout.x.length; i++) {
        const d = Math.hypot(
          layout.x[i] - corner.trackPosition.x,
          layout.y[i] - corner.trackPosition.y,
        )
        if (d < best) {
          best = d
          nearest = i
        }
      }
      const pos = labelOffsetOutsideTrack(
        layout.x,
        layout.y,
        nearest,
        STROKE_MAIN,
        CORNER_GAP,
        corner.trackPosition.x,
        flipY(corner.trackPosition.y),
      )
      return { number: corner.number, ...pos }
    })
  }, [layout])

  const displayName = (circuitTitle ?? circuit?.circuitName ?? 'Circuit').toUpperCase()
  const displayLocation = locationLabel ?? circuit?.location ?? 'Autodromo'
  const wrapClass = darkWrap ? `${styles.wrap} ${styles.wrapDark}` : styles.wrap

  if (schemeImageUrl) {
    if (schemeImageError && circuitImage) {
      return (
        <div className={wrapClass}>
          <CircuitHeader displayLocation={displayLocation} displayName={displayName} />
          <img className={styles.fallbackImg} src={circuitImage} alt="Схема трассы" />
        </div>
      )
    }
    if (schemeImageError) {
      return (
        <div className={wrapClass}>
          <CircuitHeader displayLocation={displayLocation} displayName={displayName} />
          <p>Фото недоступно.</p>
        </div>
      )
    }
    return (
      <div className={wrapClass}>
        <CircuitHeader displayLocation={displayLocation} displayName={displayName} />
        <img
          className={styles.schemeImg}
          src={schemeImageUrl}
          alt={`Схема трассы ${displayName}`}
          onError={() => setSchemeImageError(true)}
        />
      </div>
    )
  }

  if (!circuit && circuitImage) {
    return (
      <div className={wrapClass}>
        <CircuitHeader displayLocation={displayLocation} displayName={displayName} />
        <img className={styles.fallbackImg} src={circuitImage} alt="Схема трассы" />
      </div>
    )
  }

  if (!layout?.fullPath) {
    return <p>Схема трассы недоступна.</p>
  }

  const sectorTooltip = (sector: number) => {
    if (!sectorTimes) return `S${sector}`
    const t =
      sector === 1 ? sectorTimes.s1 : sector === 2 ? sectorTimes.s2 : sectorTimes.s3
    return `S${sector}: ${formatSectorTime(t)} с`
  }

  return (
    <div className={wrapClass}>
      <CircuitHeader displayLocation={displayLocation} displayName={displayName} />

      <div className={styles.svgWrap}>
        <svg
          className={styles.svg}
          viewBox={layout.viewBox}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Схема трассы"
        >
          <path
            d={layout.fullPath}
            fill="none"
            stroke={TRACK_BASE_COLOR}
            strokeWidth={STROKE_MAIN + 80}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {layout.sectorPaths.map(({ d, sector, color }) => (
            <path
              key={sector}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_MAIN}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {layout.pitLanePath && (
            <path
              d={layout.pitLanePath}
              fill="none"
              stroke={PIT_LANE_COLOR}
              strokeWidth={STROKE_PIT}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100 70"
            />
          )}

          {layout.smZones.map((zone, i) => (
            <path
              key={i}
              d={zone.d}
              fill="none"
              stroke={SM_ZONE_COLOR}
              strokeWidth={STROKE_SM}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {cornerLabels.map(({ number, x, y }) => (
            <text
              key={number}
              x={x}
              y={y}
              className={styles.labelText}
              fontSize={CORNER_FONT}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {number}
            </text>
          ))}

          {sectorLabels.map(({ sector, x, y }) => (
            <text
              key={sector}
              x={x}
              y={y}
              className={`${styles.labelText} ${styles.sectorLabel}`}
              fontSize={SECTOR_FONT}
              fill={SECTOR_COLORS[sector - 1]}
              textAnchor="middle"
              dominantBaseline="middle"
              onMouseEnter={() => setHoveredSector(sector)}
              onMouseLeave={() => setHoveredSector(null)}
              style={{ cursor: 'default' }}
            >
              {hoveredSector === sector ? sectorTooltip(sector) : `S${sector}`}
            </text>
          ))}

          {layout.smZones.map((zone, i) => (
            <text
              key={`sm-${i}`}
              x={zone.labelPos.x}
              y={zone.labelPos.y}
              className={styles.smLabel}
              fontSize={180}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              SM-зона
            </text>
          ))}
        </svg>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: SECTOR_COLORS[0] }} />
          Сектор 1
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: SECTOR_COLORS[1] }} />
          Сектор 2
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: SECTOR_COLORS[2] }} />
          Сектор 3
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: PIT_LANE_COLOR }} />
          Питлейн
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: SM_ZONE_COLOR }} />
          SM-зона
        </span>
      </div>
    </div>
  )
}
