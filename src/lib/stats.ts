import type { GameComputed, GamePeriodComputed } from "@/lib/types/database";

// ============================================================
// Helpers
// ============================================================

/** Parse "MM:SS" or "H:MM:SS" TOI string to total minutes */
export function parseTOIMinutes(toi: string): number {
  const parts = toi.split(":");
  if (parts.length === 3) {
    return (
      (parseInt(parts[0], 10) || 0) * 60 +
      (parseInt(parts[1], 10) || 0) +
      (parseInt(parts[2], 10) || 0) / 60
    );
  }
  const mins = parseInt(parts[0], 10) || 0;
  const secs = parseInt(parts[1], 10) || 0;
  return mins + secs / 60;
}

/** Format minutes as "MM:SS" */
export function formatMinutes(totalMins: number): string {
  const m = Math.floor(totalMins);
  const s = Math.round((totalMins - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format minutes as "DD:HH:MM:SS" for large totals (omits days if 0) */
export function formatHoursMinutes(totalMins: number): string {
  const totalSecs = Math.round(totalMins * 60);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (d > 0) {
    return `${d}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Per-60 rate: value * 60 / totalMinutes */
function per60(value: number, totalMinutes: number): number | null {
  return totalMinutes > 0 ? (value * 60) / totalMinutes : null;
}

/** Total expected saves / total SOG (uses all games for SOG denominator) */
function avgXSvPct(games: GameComputed[]): number | null {
  const xgaGames = games.filter((g) => g.xga != null);
  if (xgaGames.length === 0) return null;
  const totalExpectedSaves = xgaGames.reduce((s, g) => s + (g.sog - g.xga!), 0);
  const totalSOG = games.reduce((s, g) => s + g.sog, 0);
  return totalSOG > 0 ? totalExpectedSaves / totalSOG : null;
}

/** Compute record: W - Regulation Losses - OT/SO Losses */
function computeRecord(games: GameComputed[]) {
  let wins = 0;
  let regLosses = 0;
  let otsoLosses = 0;
  for (const g of games) {
    if (g.win === true) wins++;
    else if (g.win === false) {
      if (g.ot || g.so) otsoLosses++;
      else regLosses++;
    }
  }
  return {
    wins,
    losses: regLosses + otsoLosses,
    regLosses,
    otsoLosses,
    record: `${wins}-${regLosses}-${otsoLosses}`,
  };
}

/** Compute OT record: W-L-T (ties = games that went to OT but weren't decided, i.e. went to SO) */
function computeOTRecord(games: GameComputed[]) {
  const otGames = games.filter((g) => g.ot);
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const g of otGames) {
    if (g.so) {
      // Game went to SO — counts as a tie for OT purposes
      ties++;
    } else if (g.win === true) {
      wins++;
    } else if (g.win === false) {
      losses++;
    }
  }
  return { wins, losses, ties, record: `${wins}-${losses}-${ties}` };
}

/** Compute SO record: W-L only */
function computeSORecord(games: GameComputed[]) {
  const soGames = games.filter((g) => g.so);
  let wins = 0;
  let losses = 0;
  for (const g of soGames) {
    if (g.win === true) wins++;
    else if (g.win === false) losses++;
  }
  return { wins, losses, record: `${wins}-${losses}` };
}

/** Compute total minutes for a set of games */
function totalMinsForGames(games: GameComputed[]): number {
  return games.reduce((s, g) => s + parseTOIMinutes(g.toi), 0);
}

// ============================================================
// Grade stats interface
// ============================================================

export interface GradeStats {
  svPct: number | null;
  goals: number;
  shots: number;
  gaa: number | null;
  avgSOG: number | null;
  gaVsTotalGA: number | null;
  sogVsTotalSOG: number | null;
}

// ============================================================
// Past games stats interface
// ============================================================

export interface PastGamesStats {
  last5SvPct: number | null;
  last10SvPct: number | null;
  last20SvPct: number | null;
  last5GAA: number | null;
  last10GAA: number | null;
  last20GAA: number | null;
  topSaves: { date: string; saves: number; opponent: string }[];
  topGA: { date: string; ga: number; opponent: string }[];
}

// ============================================================
// Aggregate stats interface
// ============================================================

export interface AggregateStats {
  // Overall
  gp: number;
  homeGP: number;
  awayGP: number;
  wins: number;
  losses: number;
  regLosses: number;
  otsoLosses: number;
  record: string;
  winPct: number;

  // TOI
  totalMinutes: number;
  totalTOI: string;
  avgTOIPerGame: string;
  avgTOIStarted: string;
  avgTOIPulled: string;
  avgTOIDidntStart: string;

  // Started / Pulled / Backup
  gamesStarted: number;
  pctGPStarted: number | null;
  gamesPulled: number;
  pctGSPulled: number | null;
  gamesAsBackup: number;
  pctGPAsBackup: number | null;

  // OT / SO game counts
  otGames: number;
  soGames: number;
  pctGPWithOT: number | null;
  pctOTWithSO: number | null;

  // OT / SO time stats (require periods)
  totalOTTime: string | null;
  avgOTTime: string | null;
  longestOTTime: string | null;
  totalSOAttempts: number | null;
  avgSOAttempts: number | null;
  longestSOGame: number | null;

  // Core stats
  svPct: number | null;
  gaa: number | null;
  totalSOG: number;
  totalGA: number;
  totalSV: number;
  totalTSA: number;
  avgSOG: number | null;
  avgGA: number | null;
  avgTSA: number | null;
  pctTSAOnTarget: number | null;

  // Expected stats (SOG-weighted xSV%)
  xSvPct: number | null;
  svPctMinusXSvPct: number | null;
  totalXGA: number | null;
  xgaMinusGA: number | null;
  xGAA: number | null;
  xGAAMinusGAA: number | null;

  // High/low shot games (fixed thresholds: >35 / <20)
  highShotGames: number;
  lowShotGames: number;

  // Record breakdowns
  homeRecord: string;
  homeWins: number;
  homeLosses: number;
  homeRegLosses: number;
  homeOtsoLosses: number;
  homeWinPct: number;
  awayRecord: string;
  awayWins: number;
  awayLosses: number;
  awayRegLosses: number;
  awayOtsoLosses: number;
  awayWinPct: number;
  otRecord: string;
  otWins: number;
  otLosses: number;
  otTies: number;
  otWinPct: number;
  soRecord: string;
  soWins: number;
  soLosses: number;
  soWinPct: number;

  // Grade stats
  gradeAplus: GradeStats;
  gradeA: GradeStats;
  gradeB: GradeStats;
  gradeC: GradeStats;
  gradeAplusGoals: number;
  gradeAGoals: number;
  gradeBGoals: number;
  gradeCGoals: number;
  gradeAplusShots: number;
  gradeAShots: number;
  gradeBShots: number;
  gradeCShots: number;

  // Shot stat splits
  svPctHighShot: number | null;
  svPctLowShot: number | null;
  svPctMinusXSvPctHighShot: number | null;
  svPctMinusXSvPctLowShot: number | null;
  svPctHome: number | null;
  svPctAway: number | null;
  xSvPctHome: number | null;
  xSvPctAway: number | null;
  svPctMinusXSvPctHome: number | null;
  svPctMinusXSvPctAway: number | null;
  totalSB: number;
  totalSM: number;
  sbPct: number | null;
  smPct: number | null;
  totalPipes: number;

  // PK shot stats
  pkCount: number;
  pkGA: number;
  pkTSA: number;
  pkSOG: number;
  ppGA: number;
  pkSOGVsSOG: number | null;
  pkSOGPerGP: number | null;
  pkTSAPerGP: number | null;
  pkTSAVsTSA: number | null;
  sogPerPK: number | null;
  tsaPerPK: number | null;
  pkTSAOnTarget: number | null;

  // GA splits
  gaaFirst5Mins: number | null;
  gaaLast5Mins: number | null;
  gaaFirst5Shots: number | null;
  gaaHome: number | null;
  gaaAway: number | null;
  xGAAHome: number | null;
  xGAAAway: number | null;
  xGAAMinusGAAHome: number | null;
  xGAAMinusGAAAway: number | null;
  gaaHighShot: number | null;
  gaaLowShot: number | null;
  xGAAMinusGAAHighShot: number | null;
  xGAAMinusGAALowShot: number | null;
  pkGAVsGA: number | null;
  pkGAA: number | null;
  avgGAPerPK: number | null;
  ppGAA: number | null;

  // Rebounds
  totalReboundGreen: number;
  totalReboundRed: number;
  totalReboundBlack: number;
  avgReboundGreen: number | null;
  avgReboundRed: number | null;
  avgReboundBlack: number | null;
  reboundsPerSave: number | null;
  reboundControlRate: number | null;

  // Glove
  totalGloveShots: number;
  gloveShotsPerGP: number | null;
  totalGloveGreen: number;
  totalGloveRed: number;
  totalGloveBlack: number;
  avgGloveGreen: number | null;
  avgGloveRed: number | null;
  avgGloveBlack: number | null;
  gloveRate: number | null;
  gloveFreezeRate: number | null;

  // Playmaking
  totalPlayGreen: number;
  totalPlayRed: number;
  totalPlayBlack: number;
  playmakingPerGP: number | null;
  avgPlayGreen: number | null;
  avgPlayRed: number | null;
  avgPlayBlack: number | null;
  playRetentionRate: number | null;

  // B2B
  b2bGP: number;
  b2bWins: number;
  b2bLosses: number;
  b2bRegLosses: number;
  b2bOtsoLosses: number;
  b2bRecord: string;
  b2bWinPct: number | null;
  b2bSvPct: number | null;
  b2bGAA: number | null;
  b2bReboundControlRate: number | null;
  b2bPulledVsTotal: string | null;

  // Playoff
  playoffGP: number;
  playoffWins: number;
  playoffLosses: number;
  playoffRecord: string;

  // PK time (requires pk_time field in DB)
  totalPKTime: string | null;
  pkTimePerGP: string | null;
  pkTimePerPK: string | null;
  avgPKCount: number | null;

  // Finish types
  regulationFinishes: number;
  otFinishes: number;
  soFinishes: number;

  // Past games
  pastGames: PastGamesStats;
}

// ============================================================
// computeAggregateStats
// ============================================================

/** Compute aggregate stats from games (and optionally periods) */
export function computeAggregateStats(
  games: GameComputed[],
  periods?: GamePeriodComputed[],
): AggregateStats {
  const gp = games.length;

  // ── Record ─────────────────────────────────────────────
  const { wins, losses, regLosses, otsoLosses, record } = computeRecord(games);
  const winPct = gp > 0 ? wins / gp : 0;

  // ── Home / Away ────────────────────────────────────────
  const homeGames = games.filter((g) => g.home_away === "H");
  const awayGames = games.filter((g) => g.home_away === "A");
  const homeGP = homeGames.length;
  const awayGP = awayGames.length;
  const homeRec = computeRecord(homeGames);
  const awayRec = computeRecord(awayGames);

  // ── TOI ────────────────────────────────────────────────
  const totalMinutes = totalMinsForGames(games);
  const totalTOI = formatHoursMinutes(totalMinutes);
  const avgTOIPerGame = gp > 0 ? formatMinutes(totalMinutes / gp) : "0:00";

  const startedGames = games.filter((g) => g.started);
  const pulledGames = games.filter((g) => g.pulled);
  const backupGames = games.filter((g) => !g.started);
  const gamesStarted = startedGames.length;
  const gamesPulled = pulledGames.length;
  const gamesAsBackup = backupGames.length;
  const pctGPStarted = gp > 0 ? gamesStarted / gp : null;
  const pctGSPulled = gamesStarted > 0 ? gamesPulled / gamesStarted : null;
  const pctGPAsBackup = gp > 0 ? gamesAsBackup / gp : null;
  const avgTOIStarted =
    startedGames.length > 0
      ? formatMinutes(totalMinsForGames(startedGames) / startedGames.length)
      : "0:00";
  const avgTOIPulled =
    pulledGames.length > 0
      ? formatMinutes(totalMinsForGames(pulledGames) / pulledGames.length)
      : "0:00";
  const avgTOIDidntStart =
    backupGames.length > 0
      ? formatMinutes(totalMinsForGames(backupGames) / backupGames.length)
      : "0:00";

  // ── OT / SO counts ────────────────────────────────────
  const otGamesList = games.filter((g) => g.ot);
  const soGamesList = games.filter((g) => g.so);
  const otGames = otGamesList.length;
  const soGames = soGamesList.length;
  const pctGPWithOT = gp > 0 ? otGames / gp : null;
  const pctOTWithSO = otGames > 0 ? soGames / otGames : null;

  // ── OT / SO time (from periods) ───────────────────────
  let totalOTTime: string | null = null;
  let avgOTTime: string | null = null;
  let longestOTTime: string | null = null;
  let totalSOAttempts: number | null = null;
  let avgSOAttempts: number | null = null;
  let longestSOGame: number | null = null;
  if (periods) {
    const otPeriods = periods.filter((p) => p.period === "OT");
    if (otPeriods.length > 0) {
      const otMins = otPeriods.reduce(
        (s, p) => s + (p.toi ? parseTOIMinutes(p.toi) : 0),
        0,
      );
      totalOTTime = formatMinutes(otMins);
      avgOTTime = formatMinutes(otMins / otPeriods.length);
      const maxOT = Math.max(
        ...otPeriods.map((p) => (p.toi ? parseTOIMinutes(p.toi) : 0)),
      );
      longestOTTime = formatMinutes(maxOT);
    }
    const soPeriods = periods.filter((p) => p.period === "SO");
    if (soPeriods.length > 0) {
      const soSOG = soPeriods.map((p) => p.sog);
      totalSOAttempts = soSOG.reduce((s, v) => s + v, 0);
      avgSOAttempts = totalSOAttempts / soPeriods.length;
      longestSOGame = Math.max(...soSOG);
    }
  }

  // ── OT / SO records ───────────────────────────────────
  const otRec = computeOTRecord(games);
  const soRec = computeSORecord(games);

  // ── Core totals ────────────────────────────────────────
  const totalSOG = games.reduce((s, g) => s + g.sog, 0);
  const totalGA = games.reduce((s, g) => s + g.ga, 0);
  const totalSV = games.reduce((s, g) => s + g.sv, 0);
  const totalTSA = games.reduce((s, g) => s + g.tsa, 0);
  const svPct = totalSOG > 0 ? totalSV / totalSOG : null;
  const gaa = per60(totalGA, totalMinutes);
  const avgSOG = per60(totalSOG, totalMinutes);
  const avgGA = per60(totalGA, totalMinutes);
  const avgTSA = per60(totalTSA, totalMinutes);
  const pctTSAOnTarget = totalTSA > 0 ? totalSOG / totalTSA : null;

  // ── xSV% (SOG-weighted) ───────────────────────────────
  const xSvPct = avgXSvPct(games);
  const svPctMinusXSvPct =
    svPct != null && xSvPct != null ? svPct - xSvPct : null;

  // ── xGA ────────────────────────────────────────────────
  const gamesWithXGA = games.filter((g) => g.xga != null);
  const totalXGA =
    gamesWithXGA.length > 0
      ? gamesWithXGA.reduce((s, g) => s + g.xga!, 0)
      : null;
  const xgaMinusGA = totalXGA != null ? totalXGA - totalGA : null;
  const xGAA = totalXGA != null ? per60(totalXGA, totalMinutes) : null;
  const xGAAMinusGAA =
    xGAA != null && gaa != null ? xGAA - gaa : null;

  // ── High / low shot games (fixed thresholds) ──────────
  const highShotGames = games.filter((g) => g.sog > 35).length;
  const lowShotGames = games.filter((g) => g.sog < 20).length;

  // ── SV% splits ─────────────────────────────────────────
  const highShotSubset = games.filter((g) => g.sog > 35);
  const lowShotSubset = games.filter((g) => g.sog < 20);

  function subsetSvPct(subset: GameComputed[]): number | null {
    const sog = subset.reduce((s, g) => s + g.sog, 0);
    const sv = subset.reduce((s, g) => s + g.sv, 0);
    return sog > 0 ? sv / sog : null;
  }
  function subsetXSvPctMinusSvPct(subset: GameComputed[]): number | null {
    const sv = subsetSvPct(subset);
    const xsv = avgXSvPct(subset);
    return sv != null && xsv != null ? sv - xsv : null;
  }

  const svPctHighShot = subsetSvPct(highShotSubset);
  const svPctLowShot = subsetSvPct(lowShotSubset);
  const svPctMinusXSvPctHighShot = subsetXSvPctMinusSvPct(highShotSubset);
  const svPctMinusXSvPctLowShot = subsetXSvPctMinusSvPct(lowShotSubset);
  const svPctHome = subsetSvPct(homeGames);
  const svPctAway = subsetSvPct(awayGames);
  const xSvPctHome = avgXSvPct(homeGames);
  const xSvPctAway = avgXSvPct(awayGames);
  const svPctMinusXSvPctHome =
    svPctHome != null && xSvPctHome != null ? svPctHome - xSvPctHome : null;
  const svPctMinusXSvPctAway =
    svPctAway != null && xSvPctAway != null ? svPctAway - xSvPctAway : null;

  // ── Shot blocks / misses ───────────────────────────────
  const totalSB = games.reduce((s, g) => s + g.sb, 0);
  const totalSM = games.reduce((s, g) => s + g.sm, 0);
  const totalPipes = games.reduce((s, g) => s + g.pipes, 0);
  const sbPct = totalTSA > 0 ? totalSB / totalTSA : null;
  const smPct = totalTSA > 0 ? totalSM / totalTSA : null;

  // ── PK / PP shot stats ─────────────────────────────────
  const pkCount = games.reduce((s, g) => s + g.pk_count, 0);
  const pkGA = games.reduce((s, g) => s + g.pk_ga, 0);
  const pkTSA = games.reduce((s, g) => s + g.pk_tsa, 0);
  const pkSOG = games.reduce((s, g) => s + g.pk_sog, 0);
  const ppGA = games.reduce((s, g) => s + g.pp_ga, 0);
  const pkSOGVsSOG = totalSOG > 0 ? pkSOG / totalSOG : null;
  const pkSOGPerGP = per60(pkSOG, totalMinutes);
  const pkTSAPerGP = per60(pkTSA, totalMinutes);
  const pkTSAVsTSA = totalTSA > 0 ? pkTSA / totalTSA : null;
  const sogPerPK = pkCount > 0 ? pkSOG / pkCount : null;
  const tsaPerPK = pkCount > 0 ? pkTSA / pkCount : null;
  const pkTSAOnTarget = pkTSA > 0 ? pkSOG / pkTSA : null;

  // ── GA splits ──────────────────────────────────────────
  const gaFirst5Mins = games.reduce((s, g) => s + g.ga_first_5_mins, 0);
  const gaLast5Mins = games.reduce((s, g) => s + g.ga_last_5_mins, 0);
  const gaFirst5Shots = games.reduce((s, g) => s + g.ga_first_5_shots, 0);
  const gaaFirst5Mins = per60(gaFirst5Mins, totalMinutes);
  const gaaLast5Mins = per60(gaLast5Mins, totalMinutes);
  const gaaFirst5Shots = per60(gaFirst5Shots, totalMinutes);

  const homeGA = homeGames.reduce((s, g) => s + g.ga, 0);
  const awayGA = awayGames.reduce((s, g) => s + g.ga, 0);
  const homeMins = totalMinsForGames(homeGames);
  const awayMins = totalMinsForGames(awayGames);
  const gaaHome = per60(homeGA, homeMins);
  const gaaAway = per60(awayGA, awayMins);

  const homeXGA = homeGames
    .filter((g) => g.xga != null)
    .reduce((s, g) => s + g.xga!, 0);
  const awayXGA = awayGames
    .filter((g) => g.xga != null)
    .reduce((s, g) => s + g.xga!, 0);
  const xGAAHome =
    homeGames.some((g) => g.xga != null) ? per60(homeXGA, homeMins) : null;
  const xGAAAway =
    awayGames.some((g) => g.xga != null) ? per60(awayXGA, awayMins) : null;
  const xGAAMinusGAAHome =
    xGAAHome != null && gaaHome != null ? xGAAHome - gaaHome : null;
  const xGAAMinusGAAAway =
    xGAAAway != null && gaaAway != null ? xGAAAway - gaaAway : null;

  const highShotGA = highShotSubset.reduce((s, g) => s + g.ga, 0);
  const lowShotGA = lowShotSubset.reduce((s, g) => s + g.ga, 0);
  const highMins = totalMinsForGames(highShotSubset);
  const lowMins = totalMinsForGames(lowShotSubset);
  const gaaHighShot = per60(highShotGA, highMins);
  const gaaLowShot = per60(lowShotGA, lowMins);

  const highXGA = highShotSubset
    .filter((g) => g.xga != null)
    .reduce((s, g) => s + g.xga!, 0);
  const lowXGA = lowShotSubset
    .filter((g) => g.xga != null)
    .reduce((s, g) => s + g.xga!, 0);
  const xGAAHighShot = highShotSubset.some((g) => g.xga != null)
    ? per60(highXGA, highMins)
    : null;
  const xGAALowShot = lowShotSubset.some((g) => g.xga != null)
    ? per60(lowXGA, lowMins)
    : null;
  const xGAAMinusGAAHighShot =
    xGAAHighShot != null && gaaHighShot != null
      ? xGAAHighShot - gaaHighShot
      : null;
  const xGAAMinusGAALowShot =
    xGAALowShot != null && gaaLowShot != null
      ? xGAALowShot - gaaLowShot
      : null;

  // Pre-compute PK time: use pk_time if available, otherwise sum pim_total
  const pkTimeGames = games.filter((g) => g.pk_time != null);
  const pimGames = games.filter((g) => g.pim_total != null && g.pim_total !== "");
  const totalPKTimeMinutes =
    pkTimeGames.length > 0
      ? pkTimeGames.reduce((s, g) => s + parseTOIMinutes(g.pk_time!), 0)
      : pimGames.reduce((s, g) => s + parseTOIMinutes(g.pim_total!), 0);
  const hasPKTime = pkTimeGames.length > 0 || pimGames.length > 0;

  const pkGAVsGA = totalGA > 0 ? pkGA / totalGA : null;
  // PK GAA: use PK time when available, fall back to total TOI
  const pkGAA =
    hasPKTime && totalPKTimeMinutes > 0
      ? per60(pkGA, totalPKTimeMinutes)
      : per60(pkGA, totalMinutes);
  const avgGAPerPK = pkCount > 0 ? pkGA / pkCount : null;
  const ppGAA = per60(ppGA, totalMinutes);

  // ── Grade stats ────────────────────────────────────────
  const gradeAplusGoals = games.reduce((s, g) => s + g.grade_aplus_goals, 0);
  const gradeAGoals = games.reduce((s, g) => s + g.grade_a_goals, 0);
  const gradeBGoals = games.reduce((s, g) => s + g.grade_b_goals, 0);
  const gradeCGoals = games.reduce((s, g) => s + g.grade_c_goals, 0);
  const gradeAplusShots = games.reduce((s, g) => s + g.grade_aplus_shots, 0);
  const gradeAShots = games.reduce((s, g) => s + g.grade_a_shots, 0);
  const gradeBShots = games.reduce((s, g) => s + g.grade_b_shots, 0);
  const gradeCShots = games.reduce((s, g) => s + g.grade_c_shots, 0);

  function buildGradeStats(goals: number, shots: number): GradeStats {
    return {
      svPct: shots > 0 ? (shots - goals) / shots : null,
      goals,
      shots,
      gaa: per60(goals, totalMinutes),
      avgSOG: per60(shots, totalMinutes),
      gaVsTotalGA: totalGA > 0 ? goals / totalGA : null,
      sogVsTotalSOG: totalSOG > 0 ? shots / totalSOG : null,
    };
  }

  const gradeAplus = buildGradeStats(gradeAplusGoals, gradeAplusShots);
  const gradeA = buildGradeStats(gradeAGoals, gradeAShots);
  const gradeB = buildGradeStats(gradeBGoals, gradeBShots);
  const gradeC = buildGradeStats(gradeCGoals, gradeCShots);

  // ── Rebounds (green+black = controlled) ────────────────
  const totalReboundGreen = games.reduce((s, g) => s + g.rebound_green, 0);
  const totalReboundRed = games.reduce((s, g) => s + g.rebound_red, 0);
  const totalReboundBlack = games.reduce((s, g) => s + g.rebound_black, 0);
  const reboundTotal = totalReboundGreen + totalReboundRed + totalReboundBlack;
  const reboundControlRate =
    reboundTotal > 0
      ? (totalReboundGreen + totalReboundBlack) / reboundTotal
      : null;
  const avgReboundGreen = per60(totalReboundGreen, totalMinutes);
  const avgReboundRed = per60(totalReboundRed, totalMinutes);
  const avgReboundBlack = per60(totalReboundBlack, totalMinutes);
  const reboundsPerSave = totalSV > 0 ? reboundTotal / totalSV : null;

  // ── Glove (green+black = saved) ────────────────────────
  const totalGloveGreen = games.reduce((s, g) => s + g.glove_green, 0);
  const totalGloveRed = games.reduce((s, g) => s + g.glove_red, 0);
  const totalGloveBlack = games.reduce((s, g) => s + g.glove_black, 0);
  const totalGloveShots = totalGloveGreen + totalGloveRed + totalGloveBlack;
  const gloveShotsPerGP = per60(totalGloveShots, totalMinutes);
  const gloveRate =
    totalGloveShots > 0
      ? (totalGloveGreen + totalGloveBlack) / totalGloveShots
      : null;
  const gloveFreezeRate =
    totalGloveShots > 0 ? totalGloveBlack / totalGloveShots : null;
  const avgGloveGreen = per60(totalGloveGreen, totalMinutes);
  const avgGloveRed = per60(totalGloveRed, totalMinutes);
  const avgGloveBlack = per60(totalGloveBlack, totalMinutes);

  // ── Playmaking (green+black = retained) ────────────────
  const totalPlayGreen = games.reduce((s, g) => s + g.playmaking_green, 0);
  const totalPlayRed = games.reduce((s, g) => s + g.playmaking_red, 0);
  const totalPlayBlack = games.reduce((s, g) => s + g.playmaking_black, 0);
  const playTotal = totalPlayGreen + totalPlayRed + totalPlayBlack;
  const playmakingPerGP = per60(playTotal, totalMinutes);
  const playRetentionRate =
    playTotal > 0 ? (totalPlayGreen + totalPlayBlack) / playTotal : null;
  const avgPlayGreen = per60(totalPlayGreen, totalMinutes);
  const avgPlayRed = per60(totalPlayRed, totalMinutes);
  const avgPlayBlack = per60(totalPlayBlack, totalMinutes);

  // ── B2B ────────────────────────────────────────────────
  const b2bGames = games.filter((g) => g.b2b);
  const b2bGP = b2bGames.length;
  const b2bRec = computeRecord(b2bGames);
  const b2bWinPct = b2bGP > 0 ? b2bRec.wins / b2bGP : null;
  const b2bSOG = b2bGames.reduce((s, g) => s + g.sog, 0);
  const b2bSV = b2bGames.reduce((s, g) => s + g.sv, 0);
  const b2bSvPct = b2bSOG > 0 ? b2bSV / b2bSOG : null;
  const b2bMins = totalMinsForGames(b2bGames);
  const b2bTotalGA = b2bGames.reduce((s, g) => s + g.ga, 0);
  const b2bGAA = per60(b2bTotalGA, b2bMins);
  const b2bRebGreen = b2bGames.reduce((s, g) => s + g.rebound_green, 0);
  const b2bRebBlack = b2bGames.reduce((s, g) => s + g.rebound_black, 0);
  const b2bRebTotal = b2bGames.reduce(
    (s, g) => s + g.rebound_green + g.rebound_red + g.rebound_black,
    0,
  );
  const b2bReboundControlRate =
    b2bRebTotal > 0 ? (b2bRebGreen + b2bRebBlack) / b2bRebTotal : null;
  const b2bPulled = b2bGames.filter((g) => g.pulled).length;
  const b2bPulledVsTotal =
    b2bGP > 0 ? `${b2bPulled}/${gamesPulled}` : null;

  // ── Playoff ────────────────────────────────────────────
  const playoffGames = games.filter((g) => g.playoff);
  const playoffGP = playoffGames.length;
  const playoffRec = computeRecord(playoffGames);
  const playoffRecord = `${playoffRec.wins}-${playoffRec.losses}`;

  // ── PK time stats (pkTimeGames/totalPKTimeMinutes computed earlier)
  const totalPKTime =
    hasPKTime ? formatMinutes(totalPKTimeMinutes) : null;
  const pkTimePerGP =
    hasPKTime && gp > 0
      ? formatMinutes(totalPKTimeMinutes / gp)
      : null;
  const pkTimePerPK =
    hasPKTime && pkCount > 0
      ? formatMinutes(totalPKTimeMinutes / pkCount)
      : null;
  const avgPKCount = per60(pkCount, totalMinutes);

  // ── Finish types ───────────────────────────────────────
  const otFinishes = games.filter((g) => g.ot && !g.so).length;
  const soFinishes = games.filter((g) => g.so).length;
  const regulationFinishes = gp - otFinishes - soFinishes;

  // ── Past games stats ───────────────────────────────────
  const pastGames = computePastGamesStats(games);

  return {
    gp,
    homeGP,
    awayGP,
    wins,
    losses,
    regLosses,
    otsoLosses,
    record,
    winPct,
    totalMinutes,
    totalTOI,
    avgTOIPerGame,
    avgTOIStarted,
    avgTOIPulled,
    avgTOIDidntStart,
    gamesStarted,
    pctGPStarted,
    gamesPulled,
    pctGSPulled,
    gamesAsBackup,
    pctGPAsBackup,
    otGames,
    soGames,
    pctGPWithOT,
    pctOTWithSO,
    totalOTTime,
    avgOTTime,
    longestOTTime,
    totalSOAttempts,
    avgSOAttempts,
    longestSOGame,
    svPct,
    gaa,
    totalSOG,
    totalGA,
    totalSV,
    totalTSA,
    avgSOG,
    avgGA,
    avgTSA,
    pctTSAOnTarget,
    xSvPct,
    svPctMinusXSvPct,
    totalXGA,
    xgaMinusGA,
    xGAA,
    xGAAMinusGAA,
    highShotGames,
    lowShotGames,
    homeRecord: homeRec.record,
    homeWins: homeRec.wins,
    homeLosses: homeRec.losses,
    homeRegLosses: homeRec.regLosses,
    homeOtsoLosses: homeRec.otsoLosses,
    homeWinPct: homeGP > 0 ? homeRec.wins / homeGP : 0,
    awayRecord: awayRec.record,
    awayWins: awayRec.wins,
    awayLosses: awayRec.losses,
    awayRegLosses: awayRec.regLosses,
    awayOtsoLosses: awayRec.otsoLosses,
    awayWinPct: awayGP > 0 ? awayRec.wins / awayGP : 0,
    otRecord: otRec.record,
    otWins: otRec.wins,
    otLosses: otRec.losses,
    otTies: otRec.ties,
    otWinPct: otGames > 0 ? otRec.wins / otGames : 0,
    soRecord: soRec.record,
    soWins: soRec.wins,
    soLosses: soRec.losses,
    soWinPct: soGames > 0 ? soRec.wins / soGames : 0,
    gradeAplus,
    gradeA,
    gradeB,
    gradeC,
    gradeAplusGoals,
    gradeAGoals,
    gradeBGoals,
    gradeCGoals,
    gradeAplusShots,
    gradeAShots,
    gradeBShots,
    gradeCShots,
    svPctHighShot,
    svPctLowShot,
    svPctMinusXSvPctHighShot,
    svPctMinusXSvPctLowShot,
    svPctHome,
    svPctAway,
    xSvPctHome,
    xSvPctAway,
    svPctMinusXSvPctHome,
    svPctMinusXSvPctAway,
    totalSB,
    totalSM,
    sbPct,
    smPct,
    totalPipes,
    pkCount,
    pkGA,
    pkTSA,
    pkSOG,
    ppGA,
    pkSOGVsSOG,
    pkSOGPerGP,
    pkTSAPerGP,
    pkTSAVsTSA,
    sogPerPK,
    tsaPerPK,
    pkTSAOnTarget,
    gaaFirst5Mins,
    gaaLast5Mins,
    gaaFirst5Shots,
    gaaHome,
    gaaAway,
    xGAAHome,
    xGAAAway,
    xGAAMinusGAAHome,
    xGAAMinusGAAAway,
    gaaHighShot,
    gaaLowShot,
    xGAAMinusGAAHighShot,
    xGAAMinusGAALowShot,
    pkGAVsGA,
    pkGAA,
    avgGAPerPK,
    ppGAA,
    totalReboundGreen,
    totalReboundRed,
    totalReboundBlack,
    avgReboundGreen,
    avgReboundRed,
    avgReboundBlack,
    reboundsPerSave,
    reboundControlRate,
    totalGloveShots,
    gloveShotsPerGP,
    totalGloveGreen,
    totalGloveRed,
    totalGloveBlack,
    avgGloveGreen,
    avgGloveRed,
    avgGloveBlack,
    gloveRate,
    gloveFreezeRate,
    totalPlayGreen,
    totalPlayRed,
    totalPlayBlack,
    playmakingPerGP,
    avgPlayGreen,
    avgPlayRed,
    avgPlayBlack,
    playRetentionRate,
    b2bGP,
    b2bWins: b2bRec.wins,
    b2bLosses: b2bRec.losses,
    b2bRegLosses: b2bRec.regLosses,
    b2bOtsoLosses: b2bRec.otsoLosses,
    b2bRecord: b2bRec.record,
    b2bWinPct,
    b2bSvPct,
    b2bGAA,
    b2bReboundControlRate,
    b2bPulledVsTotal,
    playoffGP,
    playoffWins: playoffRec.wins,
    playoffLosses: playoffRec.losses,
    playoffRecord,
    totalPKTime,
    pkTimePerGP,
    pkTimePerPK,
    avgPKCount,
    regulationFinishes,
    otFinishes,
    soFinishes,
    pastGames,
  };
}

// ============================================================
// Past games stats
// ============================================================

function computePastGamesStats(games: GameComputed[]): PastGamesStats {
  // Sort by date descending for "last N" calculations
  const sorted = [...games].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  function lastNSvPct(n: number): number | null {
    const slice = sorted.slice(0, n);
    if (slice.length < n) return null;
    const sog = slice.reduce((s, g) => s + g.sog, 0);
    const sv = slice.reduce((s, g) => s + g.sv, 0);
    return sog > 0 ? sv / sog : null;
  }

  function lastNGAA(n: number): number | null {
    const slice = sorted.slice(0, n);
    if (slice.length < n) return null;
    const ga = slice.reduce((s, g) => s + g.ga, 0);
    const mins = totalMinsForGames(slice);
    return per60(ga, mins);
  }

  // Top 5 most saves
  const topSaves = [...games]
    .sort((a, b) => b.sv - a.sv)
    .slice(0, 5)
    .map((g) => ({ date: g.date, saves: g.sv, opponent: g.opponent }));

  // Top 5 most GA
  const topGA = [...games]
    .sort((a, b) => b.ga - a.ga)
    .slice(0, 5)
    .map((g) => ({ date: g.date, ga: g.ga, opponent: g.opponent }));

  return {
    last5SvPct: lastNSvPct(5),
    last10SvPct: lastNSvPct(10),
    last20SvPct: lastNSvPct(20),
    last5GAA: lastNGAA(5),
    last10GAA: lastNGAA(10),
    last20GAA: lastNGAA(20),
    topSaves,
    topGA,
  };
}

// ============================================================
// Chart data generators (shared — usable in client & server)
// ============================================================

/** SV% distribution: bucket games by save percentage ranges (matches Excel) */
export function getSvPctDistribution(games: GameComputed[]) {
  const buckets = [
    { label: "<0.850", min: 0, max: 0.85 },
    { label: "0.850-0.880", min: 0.85, max: 0.88 },
    { label: "0.880-0.900", min: 0.88, max: 0.9 },
    { label: "0.900-0.920", min: 0.9, max: 0.92 },
    { label: "0.920-0.940", min: 0.92, max: 0.94 },
    { label: ">0.940", min: 0.94, max: 2 },
  ];

  return buckets.map((b) => ({
    range: b.label,
    count: games.filter(
      (g) => g.sv_pct != null && g.sv_pct >= b.min && g.sv_pct < b.max,
    ).length,
  }));
}

/** GA distribution: bucket games by goals against count (matches Excel) */
export function getGADistribution(games: GameComputed[]) {
  const buckets = [
    { label: "0", min: 0, max: 0 },
    { label: "1", min: 1, max: 1 },
    { label: "2", min: 2, max: 2 },
    { label: "3", min: 3, max: 3 },
    { label: "4", min: 4, max: 4 },
    { label: "5", min: 5, max: 5 },
    { label: "6+", min: 6, max: 999 },
  ];

  return buckets.map((b) => ({
    ga: b.label,
    count: games.filter((g) => g.ga >= b.min && g.ga <= b.max).length,
  }));
}

/** SOG distribution: bucket games by shots on goal ranges (matches Excel) */
export function getSOGDistribution(games: GameComputed[]) {
  const buckets = [
    { label: "<20", min: 0, max: 19 },
    { label: "20-25", min: 20, max: 25 },
    { label: "25-30", min: 26, max: 30 },
    { label: "30-35", min: 31, max: 35 },
    { label: "35-40", min: 36, max: 40 },
    { label: "40-45", min: 41, max: 45 },
    { label: "45+", min: 46, max: 999 },
  ];

  return buckets.map((b) => ({
    range: b.label,
    count: games.filter((g) => g.sog >= b.min && g.sog <= b.max).length,
  }));
}

/** Goals broken down by shot grade */
export function getGoalsByGrade(games: GameComputed[]) {
  const totals = {
    "A+": games.reduce((s, g) => s + g.grade_aplus_goals, 0),
    A: games.reduce((s, g) => s + g.grade_a_goals, 0),
    B: games.reduce((s, g) => s + g.grade_b_goals, 0),
    C: games.reduce((s, g) => s + g.grade_c_goals, 0),
  };

  return Object.entries(totals).map(([grade, value]) => ({
    name: grade,
    value,
  }));
}

/** Shots broken down by shot grade */
export function getShotsByGrade(games: GameComputed[]) {
  const totals = {
    "A+": games.reduce((s, g) => s + g.grade_aplus_shots, 0),
    A: games.reduce((s, g) => s + g.grade_a_shots, 0),
    B: games.reduce((s, g) => s + g.grade_b_shots, 0),
    C: games.reduce((s, g) => s + g.grade_c_shots, 0),
  };

  return Object.entries(totals).map(([grade, value]) => ({
    name: grade,
    value,
  }));
}

/** Game finish type distribution (Regulation / OT / SO) */
export function getFinishTypeDistribution(games: GameComputed[]) {
  const ot = games.filter((g) => g.ot && !g.so).length;
  const so = games.filter((g) => g.so).length;
  const reg = games.length - ot - so;

  return [
    { name: "Regulation", value: reg },
    { name: "OT", value: ot },
    { name: "Shootout", value: so },
  ];
}

/** High / Low / Regular shot game distribution (matches Excel) */
export function getHighLowRegularShotGames(games: GameComputed[]) {
  const low = games.filter((g) => g.sog < 20).length;
  const high = games.filter((g) => g.sog > 35).length;
  const regular = games.length - low - high;

  return [
    { name: "Low (<20)", value: low },
    { name: "Regular (20-35)", value: regular },
    { name: "High (>35)", value: high },
  ];
}

/** TSA breakdown: Blocked / Missed / SOG (matches Excel) */
export function getTSABreakdown(games: GameComputed[]) {
  return [
    {
      name: "Shots Blocked",
      value: games.reduce((s, g) => s + g.sb, 0),
    },
    {
      name: "Shots Missed",
      value: games.reduce((s, g) => s + g.sm, 0),
    },
    {
      name: "SOG",
      value: games.reduce((s, g) => s + g.sog, 0),
    },
  ];
}

/** Times pulled by period (matches Excel) */
export function getTimesPulledByPeriod(periods: GamePeriodComputed[]) {
  const periodOrder = ["Period 1", "Period 2", "Period 3", "OT"];

  return periodOrder.map((p) => ({
    period: p,
    count: periods.filter((per) => per.period === p && per.pulled).length,
  }));
}

/** Shot distribution across periods — grouped bar (matches Excel) */
export function getShotDistributionByPeriod(periods: GamePeriodComputed[]) {
  const ranges = [
    { label: "0-5", min: 0, max: 5 },
    { label: "5-10", min: 6, max: 10 },
    { label: "10-15", min: 11, max: 15 },
    { label: "15-20", min: 16, max: 20 },
    { label: "20+", min: 21, max: 999 },
  ];

  const periodKeys = ["Period 1", "Period 2", "Period 3"];
  const shortNames: Record<string, string> = {
    "Period 1": "P1",
    "Period 2": "P2",
    "Period 3": "P3",
  };

  return ranges.map((r) => {
    const row: Record<string, string | number> = { range: r.label };
    for (const p of periodKeys) {
      row[shortNames[p]] = periods.filter(
        (per) => per.period === p && per.sog >= r.min && per.sog <= r.max,
      ).length;
    }
    return row;
  });
}

/** Shot volume distribution per game (alias) */
export function getShotVolumeDistribution(games: GameComputed[]) {
  return getSOGDistribution(games);
}
