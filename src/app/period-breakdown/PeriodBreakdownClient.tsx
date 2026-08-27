"use client";

import { useState, useMemo } from "react";
import type { GameComputed, GamePeriodComputed } from "@/lib/types/database";

interface PeriodBreakdownClientProps {
  periods: GamePeriodComputed[];
  games: GameComputed[];
  seasons?: string[];
}

// ── Helpers ──────────────────────────────────────────────

function parseTOI(toi: string | null): number {
  if (!toi) return 0;
  const parts = toi.split(":");
  if (parts.length === 3)
    return (
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseInt(parts[2], 10)
    );
  if (parts.length === 2)
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  return 0;
}

function formatSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtPct(n: number | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

function pct1(n: number | null): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Parse period score like "2-1" → { us: 2, them: 1 } */
function parseScore(score: string | null): { us: number; them: number } | null {
  if (!score) return null;
  const m = score.match(/^(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return { us: parseInt(m[1], 10), them: parseInt(m[2], 10) };
}

type PeriodKey = "Period 1" | "Period 2" | "Period 3" | "OT";

// ── Per-period stats ─────────────────────────────────────

interface PeriodStats {
  label: string;
  shortLabel: string;
  count: number;
  pctOfGP: number | null;
  wins: number;
  losses: number;
  ties: number;
  record: string;
  winPct: number | null;
  homeWins: number;
  homeLosses: number;
  homeTies: number;
  homeRecord: string;
  homeWinPct: number | null;
  awayWins: number;
  awayLosses: number;
  awayTies: number;
  awayRecord: string;
  awayWinPct: number | null;
  totalTOI: number;
  avgTOI: number;
  avgTOIStarted: number;
  avgTOIPulled: number;
  avgTOIDidntStart: number;
  started: number;
  pulled: number;
  startedPct: number | null;
  pulledPct: number | null;
  totalSOG: number;
  totalSV: number;
  avgSOG: number | null;
  svPct: number | null;
  totalGA: number;
  gaa: number | null;
  pkSOG: number;
  pkSvPct: number | null;
  avgPKSOG: number | null;
  pkSOGVsSOG: number | null;
}

function computePeriodStats(
  periods: GamePeriodComputed[],
  games: GameComputed[],
  periodKey: PeriodKey,
): PeriodStats {
  const label = periodKey === "OT" ? "Overtime" : periodKey;
  const shortLabel =
    periodKey === "OT"
      ? "OT"
      : `P${periodKey.replace("Period ", "")}`;

  const filtered = periods.filter((p) => p.period === periodKey);
  const totalGP = games.length;
  const count = filtered.length;

  const gameMap = new Map(games.map((g) => [g.id, g]));

  let wins = 0,
    losses = 0,
    ties = 0;
  let homeWins = 0,
    homeLosses = 0,
    homeTies = 0;
  let awayWins = 0,
    awayLosses = 0,
    awayTies = 0;

  for (const p of filtered) {
    const g = gameMap.get(p.game_id);
    if (!g) continue;

    // Determine period-level result from the period score
    const parsed = parseScore(p.score);
    let result: "W" | "L" | "T" = "T";
    if (parsed) {
      if (parsed.us > parsed.them) result = "W";
      else if (parsed.us < parsed.them) result = "L";
      else result = "T";
    }

    if (result === "W") {
      wins++;
      if (g.home_away === "H") homeWins++;
      else awayWins++;
    } else if (result === "L") {
      losses++;
      if (g.home_away === "H") homeLosses++;
      else awayLosses++;
    } else {
      ties++;
      if (g.home_away === "H") homeTies++;
      else awayTies++;
    }
  }

  const homeCount = homeWins + homeLosses + homeTies;
  const awayCount = awayWins + awayLosses + awayTies;

  const totalTOI = filtered.reduce((s, p) => s + parseTOI(p.toi), 0);
  const avgTOI = count > 0 ? totalTOI / count : 0;
  const startedPeriods = filtered.filter((p) => p.started);
  const pulledPeriods = filtered.filter((p) => p.pulled);
  const didntStartPeriods = filtered.filter((p) => !p.started);
  const avgTOIStarted =
    startedPeriods.length > 0
      ? startedPeriods.reduce((s, p) => s + parseTOI(p.toi), 0) /
        startedPeriods.length
      : 0;
  const avgTOIPulled =
    pulledPeriods.length > 0
      ? pulledPeriods.reduce((s, p) => s + parseTOI(p.toi), 0) /
        pulledPeriods.length
      : 0;
  const avgTOIDidntStart =
    didntStartPeriods.length > 0
      ? didntStartPeriods.reduce((s, p) => s + parseTOI(p.toi), 0) /
        didntStartPeriods.length
      : 0;

  const totalSOG = filtered.reduce((s, p) => s + p.sog, 0);
  const totalSV = filtered.reduce((s, p) => s + p.sv, 0);
  // Average SOG per period (raw avg, not per-60)
  const avgSOG = count > 0 ? totalSOG / count : null;
  const svPct = totalSOG > 0 ? totalSV / totalSOG : null;

  const totalTOIMin = totalTOI / 60;
  const totalGA = filtered.reduce((s, p) => s + p.ga, 0);
  const gaa = totalTOIMin > 0 ? (totalGA / totalTOIMin) * 60 : null;

  const pkSOG = filtered.reduce((s, p) => s + p.pk_sog, 0);
  const pkGA = filtered.reduce((s, p) => s + p.pk_ga, 0);
  const pkSvPct = pkSOG > 0 ? (pkSOG - pkGA) / pkSOG : null;
  const avgPKSOG = count > 0 ? pkSOG / count : null;
  const pkSOGVsSOG = totalSOG > 0 ? pkSOG / totalSOG : null;

  return {
    label,
    shortLabel,
    count,
    pctOfGP: totalGP > 0 ? count / totalGP : null,
    wins,
    losses,
    ties,
    record: `${wins}-${losses}-${ties}`,
    winPct: count > 0 ? wins / count : null,
    homeWins,
    homeLosses,
    homeTies,
    homeRecord: `${homeWins}-${homeLosses}-${homeTies}`,
    homeWinPct: homeCount > 0 ? homeWins / homeCount : null,
    awayWins,
    awayLosses,
    awayTies,
    awayRecord: `${awayWins}-${awayLosses}-${awayTies}`,
    awayWinPct: awayCount > 0 ? awayWins / awayCount : null,
    totalTOI,
    avgTOI,
    avgTOIStarted,
    avgTOIPulled,
    avgTOIDidntStart,
    started: startedPeriods.length,
    pulled: pulledPeriods.length,
    startedPct: count > 0 ? startedPeriods.length / count : null,
    pulledPct: count > 0 ? pulledPeriods.length / count : null,
    totalSOG,
    totalSV,
    avgSOG,
    svPct,
    totalGA,
    gaa,
    pkSOG,
    pkSvPct,
    avgPKSOG,
    pkSOGVsSOG,
  };
}

// ── UI Components ────────────────────────────────────────

function KVRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="kv-row">
      <span className="kv-label">{label}</span>
      <span
        className="kv-value"
        style={{
          fontSize: 16,
          color: highlight ? "var(--accent)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PeriodCard({ stats }: { stats: PeriodStats }) {
  return (
    <div className="card">
      <h3 className="card-title">{stats.label}</h3>
      <div className="card-underline" />

      {/* Core */}
      <KVRow label="Total #" value={String(stats.count)} highlight />
      <KVRow label="% of GP" value={pct1(stats.pctOfGP)} />

      {/* Record */}
      <KVRow label="Record" value={stats.record} highlight />
      <KVRow label="Home Record" value={stats.homeRecord} />
      <KVRow label="Away Record" value={stats.awayRecord} />
      <KVRow label="Win %" value={pct1(stats.winPct)} highlight />
      <KVRow label="Home Win %" value={pct1(stats.homeWinPct)} />
      <KVRow label="Away Win %" value={pct1(stats.awayWinPct)} />

      {/* TOI */}
      <KVRow label="Total TOI" value={formatSec(stats.totalTOI)} highlight />
      <KVRow label="AVG TOI / Period" value={formatSec(stats.avgTOI)} />
      <KVRow label="AVG TOI Started" value={formatSec(stats.avgTOIStarted)} />
      <KVRow label="AVG TOI Pulled" value={formatSec(stats.avgTOIPulled)} />
      <KVRow label="AVG TOI Didn't Start" value={formatSec(stats.avgTOIDidntStart)} />

      {/* Started / Pulled */}
      <KVRow label="Periods Started" value={String(stats.started)} />
      <KVRow label="Periods Pulled" value={String(stats.pulled)} />
      <KVRow label="% Started" value={pct1(stats.startedPct)} />
      <KVRow label="% Pulled" value={pct1(stats.pulledPct)} />

      {/* Shots */}
      <KVRow label="Total SOG" value={String(stats.totalSOG)} highlight />
      <KVRow label="Total SV" value={String(stats.totalSV)} />
      <KVRow
        label="AVG SOG / Period"
        value={stats.avgSOG != null ? fmtNum(stats.avgSOG) : "—"}
      />
      <KVRow label="SV%" value={fmtPct(stats.svPct)} highlight />

      {/* GA */}
      <KVRow label="Total GA" value={String(stats.totalGA)} />
      <KVRow
        label="GAA"
        value={stats.gaa != null ? stats.gaa.toFixed(2) : "—"}
        highlight
      />

      {/* PK */}
      <KVRow label="PK SOG" value={String(stats.pkSOG)} />
      <KVRow
        label="AVG PK SOG / Period"
        value={stats.avgPKSOG != null ? fmtNum(stats.avgPKSOG) : "—"}
      />
      <KVRow label="PK SOG vs SOG" value={pct1(stats.pkSOGVsSOG)} />
      <KVRow label="PK SV%" value={fmtPct(stats.pkSvPct)} />
    </div>
  );
}

function ComparisonTable({
  rows,
}: {
  rows: { label: string; period: string; value: string }[];
}) {
  return (
    <table
      className="bold-table"
      style={{ tableLayout: "fixed", width: "100%" }}
    >
      <colgroup>
        <col style={{ width: "55%" }} />
        <col style={{ width: "15%", textAlign: "center" }} />
        <col style={{ width: "30%" }} />
      </colgroup>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td
              style={{
                fontSize: 12.5,
                color: "var(--text-2)",
                padding: "7px 0",
                textAlign: "left",
              }}
            >
              {r.label}
            </td>
            <td
              style={{
                textAlign: "center",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 600,
                padding: "7px 0",
              }}
            >
              {r.period}
            </td>
            <td
              style={{
                textAlign: "right",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                padding: "7px 0",
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface TopPeriod {
  game_id: string;
  period: string;
  date: string;
  opponent: string;
  value: number;
}

function formatShortDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Main component ───────────────────────────────────────

export default function PeriodBreakdownClient({
  periods,
  games,
  seasons,
}: PeriodBreakdownClientProps) {
  const safeSeasons = seasons ?? [];

  // ── Filter state ────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([...safeSeasons]);
  const [appliedFilters, setAppliedFilters] = useState<{
    seasons: string[];
    dateFrom: string;
    dateTo: string;
  }>({ seasons: [...safeSeasons], dateFrom: "", dateTo: "" });

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (!appliedFilters.seasons.includes(g.season ?? "")) return false;
      if (appliedFilters.dateFrom && g.date < appliedFilters.dateFrom) return false;
      if (appliedFilters.dateTo && g.date > appliedFilters.dateTo) return false;
      return true;
    });
  }, [games, appliedFilters]);

  const filteredGameIds = useMemo(() => new Set(filteredGames.map((g) => g.id)), [filteredGames]);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => filteredGameIds.has(p.game_id));
  }, [periods, filteredGameIds]);

  const handleApply = () => {
    setAppliedFilters({ seasons: [...selectedSeasons], dateFrom, dateTo });
  };

  const handleReset = () => {
    setFilterOpen(false);
    setDateFrom("");
    setDateTo("");
    setSelectedSeasons([...safeSeasons]);
    setAppliedFilters({ seasons: [...safeSeasons], dateFrom: "", dateTo: "" });
  };

  // ── Compute from filtered data ──────────────────────────
  const gameMap = new Map(filteredGames.map((g) => [g.id, g]));

  const periodKeys: PeriodKey[] = ["Period 1", "Period 2", "Period 3", "OT"];
  const allStats = periodKeys.map((k) => computePeriodStats(filteredPeriods, filteredGames, k));

  // Best period comparisons — exclude OT
  const regulationStats = allStats.filter(
    (s) => s.count > 0 && s.shortLabel !== "OT",
  );
  const best = (fn: (s: PeriodStats) => number | null, higher = true) => {
    if (regulationStats.length === 0) return null;
    return regulationStats.reduce((a, b) => {
      const av = fn(a) ?? (higher ? -Infinity : Infinity);
      const bv = fn(b) ?? (higher ? -Infinity : Infinity);
      return higher ? (av >= bv ? a : b) : (av <= bv ? a : b);
    });
  };

  const bestWinPct = best((s) => s.winPct);
  const mostAvgSOG = best((s) => s.avgSOG);
  const bestSvPct = best((s) => s.svPct);
  const mostSV = best((s) => s.totalSV);
  const highestGAA = best((s) => s.gaa);
  const mostGA = best((s) => s.totalGA);

  // Top 5 most saves and most GA periods
  const periodsWithMeta = filteredPeriods.map((p) => {
    const g = gameMap.get(p.game_id);
    return {
      ...p,
      date: g?.date ?? "",
      opponent: g?.opponent ?? "",
    };
  });

  const topSaves: TopPeriod[] = [...periodsWithMeta]
    .sort((a, b) => b.sv - a.sv)
    .slice(0, 5)
    .map((p) => ({
      game_id: p.game_id,
      period: p.period,
      date: p.date,
      opponent: p.opponent,
      value: p.sv,
    }));

  const topGA: TopPeriod[] = [...periodsWithMeta]
    .sort((a, b) => b.ga - a.ga)
    .slice(0, 5)
    .map((p) => ({
      game_id: p.game_id,
      period: p.period,
      date: p.date,
      opponent: p.opponent,
      value: p.ga,
    }));

  return (
    <div className="wrap">
      <div style={{ height: 28 }} />

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          marginBottom: "var(--gap)",
          gap: 10,
        }}
      >
        <span style={{ color: "var(--text-3)", fontSize: 11, marginRight: "auto" }}>
          {filteredGames.length} game{filteredGames.length !== 1 ? "s" : ""}
        </span>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${!filterOpen ? "active" : ""}`}
            onClick={handleReset}
          >
            Total
          </button>
          <button
            className={`toggle-btn ${filterOpen ? "active" : ""}`}
            onClick={() => setFilterOpen(true)}
          >
            Filters
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`filter-panel ${filterOpen ? "open" : ""}`}>
        <div className="filter-inner">
          <div>
            <label className="filter-label">Date Range</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="date"
                className="filter-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onClick={(e) => {
                  try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {}
                }}
              />
              <span style={{ color: "var(--text-3)", fontSize: 11 }}>to</span>
              <input
                type="date"
                className="filter-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                onClick={(e) => {
                  try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {}
                }}
              />
            </div>
          </div>
          <div>
            <label className="filter-label">Season</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {safeSeasons.map((s) => (
                <label
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSeasons.includes(s)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSeasons((prev) => [...prev, s]);
                      } else {
                        setSelectedSeasons((prev) => prev.filter((x) => x !== s));
                      }
                    }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <button className="filter-apply-btn" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>

      {/* Period stat cards — 4-column grid */}
      <div className="grid-4 section-gap">
        {allStats.map((s) => (
          <PeriodCard key={s.label} stats={s} />
        ))}
      </div>

      {/* Best Period Comparisons + Top Periods — combined layout */}
      <div className="comparison-layout">
        {/* Best Period Comparisons — narrow card, no excess bottom padding */}
        <div className="card" style={{ paddingBottom: 20 }}>
          <h3 className="card-title">Best Period Comparisons</h3>
          <div className="card-underline" />
          <ComparisonTable
            rows={[
              { label: "Highest Win %", period: bestWinPct?.shortLabel ?? "—", value: pct1(bestWinPct?.winPct ?? null) },
              { label: "Most AVG SOG", period: mostAvgSOG?.shortLabel ?? "—", value: mostAvgSOG?.avgSOG != null ? fmtNum(mostAvgSOG.avgSOG) : "—" },
              { label: "Best SV%", period: bestSvPct?.shortLabel ?? "—", value: fmtPct(bestSvPct?.svPct ?? null) },
              { label: "Most SV", period: mostSV?.shortLabel ?? "—", value: String(mostSV?.totalSV ?? 0) },
              { label: "Highest GAA", period: highestGAA?.shortLabel ?? "—", value: highestGAA?.gaa != null ? highestGAA.gaa.toFixed(2) : "—" },
              { label: "Most GA", period: mostGA?.shortLabel ?? "—", value: String(mostGA?.totalGA ?? 0) },
            ]}
          />
        </div>

        {/* Top Periods — combined card with separator */}
        <div className="card">
          <h3 className="card-title">Top Periods</h3>
          <div className="card-underline" />
          <div className="top-periods-split">
            {/* Most Saves */}
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-3)",
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                Most Saves
              </div>
              <table className="bold-table perf-table">
                <thead>
                  <tr>
                    <th style={{ width: 20, textAlign: "left" }}>#</th>
                    <th>Date</th>
                    <th>SV</th>
                    <th>Per</th>
                    <th>Opp</th>
                  </tr>
                </thead>
                <tbody>
                  {topSaves.map((item, i) => (
                    <tr key={`${item.game_id}-${item.period}`}>
                      <td style={{ width: 20, textAlign: "left" }}>{i + 1}</td>
                      <td>{formatShortDate(item.date)}</td>
                      <td style={{ fontWeight: 700 }}>{item.value}</td>
                      <td>{item.period.replace("Period ", "P")}</td>
                      <td>{item.opponent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Separator */}
            <div className="top-periods-sep" />

            {/* Most GA */}
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-3)",
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                Most GA
              </div>
              <table className="bold-table perf-table">
                <thead>
                  <tr>
                    <th style={{ width: 20, textAlign: "left" }}>#</th>
                    <th>Date</th>
                    <th>GA</th>
                    <th>Per</th>
                    <th>Opp</th>
                  </tr>
                </thead>
                <tbody>
                  {topGA.map((item, i) => (
                    <tr key={`${item.game_id}-${item.period}`}>
                      <td style={{ width: 20, textAlign: "left" }}>{i + 1}</td>
                      <td>{formatShortDate(item.date)}</td>
                      <td style={{ fontWeight: 700 }}>{item.value}</td>
                      <td>{item.period.replace("Period ", "P")}</td>
                      <td>{item.opponent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
