import { createClient } from '@/lib/supabase/server'
import IncrementalClient from './IncrementalClient'
import type { GameComputed } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export interface IncrementalWindow {
  gameSpan: string
  startDate: string
  endDate: string
  lengthDays: number
  gamesStarted: number
  gamesPulled: number
  avgTOI: string
  wins: number
  losses: number
  record: string
  winPct: number | null
  otCount: number
  soCount: number
  totalSOG: number
  avgSOG: number
  totalSV: number
  svPct: number | null
  xsvPct: number | null
  svPctMinusXsvPct: number | null
  pkSvPct: number | null
  highShotGames: number
  lowShotGames: number
  gamesBelow880: number
  gamesAbove920: number
  gradeAplusShots: number
  gradeAShots: number
  gradeBShots: number
  gradeCShots: number
  totalGA: number
  gaa: number | null
  totalXGA: number | null
  xgaMinusGA: number | null
}

function parseTOI(toi: string): number {
  const parts = toi.split(':')
  if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  if (parts.length === 3)
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)
  return 0
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function computeIncrementalStats(
  games: GameComputed[],
  windowSize: number,
): IncrementalWindow[] {
  if (games.length < windowSize) return []

  const windows: IncrementalWindow[] = []

  for (let i = 0; i <= games.length - windowSize; i += windowSize) {
    const windowGames = games.slice(i, i + windowSize)
    const first = windowGames[0]
    const last = windowGames[windowGames.length - 1]

    const startDate = first.date
    const endDate = last.date
    const lengthDays =
      Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24) +
      1

    const gamesStarted = windowGames.filter((g) => g.started).length
    const gamesPulled = windowGames.filter((g) => g.pulled).length

    const totalTOI = windowGames.reduce((sum, g) => sum + parseTOI(g.toi), 0)
    const avgTOI = formatSeconds(totalTOI / windowSize)

    const wins = windowGames.filter((g) => g.win === true).length
    const losses = windowGames.filter((g) => g.win === false).length

    const otCount = windowGames.filter((g) => g.ot).length
    const soCount = windowGames.filter((g) => g.so).length

    const totalSOG = windowGames.reduce((sum, g) => sum + g.sog, 0)
    const avgSOG = totalSOG / windowSize
    const totalSV = windowGames.reduce((sum, g) => sum + g.sv, 0)
    const svPct = totalSOG > 0 ? totalSV / totalSOG : null

    // Weighted xSV%
    const xsvGames = windowGames.filter((g) => g.xsv_pct != null)
    const xsvPct =
      xsvGames.length > 0
        ? xsvGames.reduce((sum, g) => sum + (g.xsv_pct ?? 0) * g.sog, 0) /
          xsvGames.reduce((sum, g) => sum + g.sog, 0)
        : null
    const svPctMinusXsvPct = svPct != null && xsvPct != null ? svPct - xsvPct : null

    // PK SV%
    const pkSOG = windowGames.reduce((sum, g) => sum + g.pk_sog, 0)
    const pkGA = windowGames.reduce((sum, g) => sum + g.pk_ga, 0)
    const pkSvPct = pkSOG > 0 ? (pkSOG - pkGA) / pkSOG : null

    // High/low shot games (using median as threshold)
    const sogValues = windowGames.map((g) => g.sog).sort((a, b) => a - b)
    const median = sogValues[Math.floor(sogValues.length / 2)]
    const highShotGames = windowGames.filter((g) => g.sog >= median + 5).length
    const lowShotGames = windowGames.filter((g) => g.sog <= median - 5).length

    // SV% thresholds
    const gamesBelow880 = windowGames.filter(
      (g) => g.sv_pct != null && g.sv_pct < 0.88,
    ).length
    const gamesAbove920 = windowGames.filter(
      (g) => g.sv_pct != null && g.sv_pct > 0.92,
    ).length

    const gradeAplusShots = windowGames.reduce((sum, g) => sum + g.grade_aplus_shots, 0)
    const gradeAShots = windowGames.reduce((sum, g) => sum + g.grade_a_shots, 0)
    const gradeBShots = windowGames.reduce((sum, g) => sum + g.grade_b_shots, 0)
    const gradeCShots = windowGames.reduce((sum, g) => sum + g.grade_c_shots, 0)

    const totalGA = windowGames.reduce((sum, g) => sum + g.ga, 0)
    const totalTOIMin = totalTOI / 60
    const gaa = totalTOIMin > 0 ? (totalGA / totalTOIMin) * 60 : null

    const xgaGames = windowGames.filter((g) => g.xga != null)
    const totalXGA =
      xgaGames.length > 0
        ? xgaGames.reduce((sum, g) => sum + (g.xga ?? 0), 0)
        : null
    const xgaMinusGA = totalXGA != null ? totalXGA - totalGA : null

    windows.push({
      gameSpan: `${i + 1}-${i + windowSize}`,
      startDate,
      endDate,
      lengthDays: Math.round(lengthDays),
      gamesStarted,
      gamesPulled,
      avgTOI,
      wins,
      losses,
      record: `${wins}-${losses}`,
      winPct: windowSize > 0 ? wins / windowSize : null,
      otCount,
      soCount,
      totalSOG,
      avgSOG,
      totalSV,
      svPct,
      xsvPct,
      svPctMinusXsvPct,
      pkSvPct,
      highShotGames,
      lowShotGames,
      gamesBelow880,
      gamesAbove920,
      gradeAplusShots,
      gradeAShots,
      gradeBShots,
      gradeCShots,
      totalGA,
      gaa,
      totalXGA,
      xgaMinusGA,
    })
  }

  return windows
}

export default async function IncrementalPage() {
  const supabase = await createClient()
  const { data: games } = await supabase
    .from('games_computed')
    .select('*')
    .order('date', { ascending: true })

  const sortedGames = games || []
  const windows5 = computeIncrementalStats(sortedGames, 5)
  const windows10 = computeIncrementalStats(sortedGames, 10)

  return (
    <IncrementalClient
      windows5={windows5}
      windows10={windows10}
      totalGames={sortedGames.length}
    />
  )
}
