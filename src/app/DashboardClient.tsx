"use client";

import { useState, useMemo, useCallback } from "react";
import type { GameComputed, GamePeriodComputed } from "@/lib/types/database";
import {
  computeAggregateStats,
  getSvPctDistribution,
  getGADistribution,
  getSOGDistribution,
  getGoalsByGrade,
  getShotsByGrade,
  getHighLowRegularShotGames,
  getTimesPulledByPeriod,
  getShotDistributionByPeriod,
  formatMinutes,
} from "@/lib/stats";
import FilterBar from "@/components/FilterBar";
import ChartCard from "@/components/ChartCard";
import {
  SVGLineChart,
  SVGBarChart,
  SVGHBarChart,
  SVGGradeChart,
  SVGGroupedBarChart,
} from "@/components/SVGCharts";

// ── Chart colors ─────────────────────────────────────────
const PERIOD_COLORS = ["#3F88C5", "#E94F37", "#A0A4A6"];

// Grade bar colors
const GRADE_BAR_COLORS: Record<string, string> = {
  "A+": "#979BA0",
  A: "#F88282",
  B: "#FFCE92",
  C: "#C6DB98",
};

// Highlight the bar with the highest value in orange; rest stay blue
function highlightMax(data: { label: string; value: number }[]): { label: string; value: number; color: string }[] {
  const maxVal = Math.max(...data.map(d => d.value));
  return data.map(d => ({
    ...d,
    color: d.value === maxVal && d.value > 0 ? "#E94F37" : "#3F88C5",
  }));
}

// ── Formatters ────────────────────────────────────────────
function fmt(n: number | null | undefined, digits = 3): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

function pct(n: number | null | undefined, digits = 1): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function svPctFmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(3);
}

function signed(n: number | null | undefined, digits = 3): string {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(digits);
}

function resultLabel(game: GameComputed): string {
  if (game.win === true) return "W";
  if (game.win === false) {
    if (game.ot || game.so) return "OTL";
    return "L";
  }
  return "—";
}

function resultCellClass(game: GameComputed): string {
  if (game.win === true) return "res-W";
  if (game.win === false) {
    if (game.ot || game.so) return "res-OTL";
    return "res-L";
  }
  return "";
}

function deltaClass(val: number | null | undefined): string {
  if (val == null) return "";
  return val > 0 ? "delta-good" : val < 0 ? "delta-bad" : "";
}

function formatDate(val: string): string {
  const d = new Date(val + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Props ─────────────────────────────────────────────────
interface DashboardClientProps {
  initialGames: GameComputed[];
  seasons: string[];
  periods: GamePeriodComputed[];
}

export default function DashboardClient({
  initialGames,
  seasons,
  periods,
}: DashboardClientProps) {
  const [games, setGames] = useState<GameComputed[]>(initialGames);
  const [view, setView] = useState<"simple" | "detailed">("simple");
  const [loading, setLoading] = useState(false);

  // ── Filter handler ─────────────────────────────────────
  const handleApplyFilters = useCallback(
    async (filters: {
      seasons: string[];
      dateFrom: string;
      dateTo: string;
    }) => {
      const params = new URLSearchParams();
      if (filters.seasons.length > 0) {
        params.set("seasons", filters.seasons.join(","));
      }
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      if ([...params.keys()].length === 0) {
        setGames(initialGames);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/games?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data: GameComputed[] = await res.json();
        setGames(data);
      } catch {
        setGames(initialGames);
      } finally {
        setLoading(false);
      }
    },
    [initialGames],
  );

  // ── Computed data ──────────────────────────────────────
  const stats = useMemo(
    () => computeAggregateStats(games, periods),
    [games, periods],
  );
  const svPctData = useMemo(() => getSvPctDistribution(games), [games]);
  const gaData = useMemo(() => getGADistribution(games), [games]);
  const sogData = useMemo(() => getSOGDistribution(games), [games]);
  const goalsByGrade = useMemo(() => getGoalsByGrade(games), [games]);
  const shotsByGrade = useMemo(() => getShotsByGrade(games), [games]);
  const shotVolume = useMemo(
    () => getHighLowRegularShotGames(games),
    [games],
  );
  const pulledByPeriod = useMemo(
    () => getTimesPulledByPeriod(periods),
    [periods],
  );
  const shotDistByPeriod = useMemo(
    () => getShotDistributionByPeriod(periods),
    [periods],
  );

  // SV% per game for line chart — last 10 games only
  const svPctPerGame = useMemo(() => {
    return [...games]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10)
      .map((g) => ({
        label: formatDate(g.date),
        actual: g.sv_pct != null ? g.sv_pct : null,
        expected: g.xsv_pct != null ? g.xsv_pct : null,
        meta: `${formatDate(g.date)} vs ${g.opponent}`,
      }));
  }, [games]);

  // Recent games — ALL games, newest first
  const recentGames = useMemo(
    () => [...games].sort((a, b) => b.date.localeCompare(a.date)),
    [games],
  );

  // GSAx value and class
  const gsax = stats.svPctMinusXSvPct;
  const gsaxClass =
    gsax != null ? (gsax > 0 ? "val-good" : gsax < 0 ? "val-bad" : "") : "";

  // ── TSA bar widths ─────────────────────────────────────
  const tsaTotal = stats.totalTSA || 1;
  const sogPct = ((stats.totalSOG / tsaTotal) * 100).toFixed(1);
  const sbPct = ((stats.totalSB / tsaTotal) * 100).toFixed(1);
  const smPct = (((stats.totalSM + (stats.totalPipes ?? 0)) / tsaTotal) * 100).toFixed(1);

  // ── Chart data transforms ─────────────────────────────
  const svPctBarData = useMemo(
    () => highlightMax(svPctData.map((d) => ({ label: d.range, value: d.count }))),
    [svPctData],
  );
  const gaBarData = useMemo(
    () => highlightMax(gaData.map((d) => ({ label: String(d.ga), value: d.count }))),
    [gaData],
  );
  const sogBarData = useMemo(
    () => highlightMax(sogData.map((d) => ({ label: d.range, value: d.count }))),
    [sogData],
  );
  const goalsByGradeData = useMemo(
    () =>
      goalsByGrade.map((d) => ({
        letter: d.name,
        goals: d.value,
        shots:
          d.name === "A+"
            ? stats.gradeAplus.shots
            : d.name === "A"
              ? stats.gradeA.shots
              : d.name === "B"
                ? stats.gradeB.shots
                : stats.gradeC.shots,
        svPct:
          d.name === "A+"
            ? stats.gradeAplus.svPct
            : d.name === "A"
              ? stats.gradeA.svPct
              : d.name === "B"
                ? stats.gradeB.svPct
                : stats.gradeC.svPct,
      })),
    [goalsByGrade, stats],
  );
  const shotsByGradeBarData = useMemo(
    () => shotsByGrade.map((d) => {
      return { label: d.name, value: d.value, color: GRADE_BAR_COLORS[d.name] ?? "#3F88C5" };
    }),
    [shotsByGrade],
  );
  const pulledBarData = useMemo(
    () => pulledByPeriod.map((d) => ({ label: d.period, value: d.count })),
    [pulledByPeriod],
  );
  const shotVolumeBarData = useMemo(
    () =>
      shotVolume.map((d, i) => ({
        label: d.name,
        value: d.value,
        color: PERIOD_COLORS[i % 3],
      })),
    [shotVolume],
  );
  const shotDistGroupedData = useMemo(
    () =>
      shotDistByPeriod.map((d) => ({
        label: String(d.range),
        values: [
          { key: "P1", value: Number(d.P1 || 0), color: PERIOD_COLORS[0] },
          { key: "P2", value: Number(d.P2 || 0), color: PERIOD_COLORS[1] },
          { key: "P3", value: Number(d.P3 || 0), color: PERIOD_COLORS[2] },
        ],
      })),
    [shotDistByPeriod],
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="wrap">
      {/* Controls */}
      <FilterBar
        view={view}
        onViewChange={setView}
        seasons={seasons}
        onApplyFilters={handleApplyFilters}
      />

      {loading && (
        <div
          style={{
            padding: "16px 0",
            fontSize: "13px",
            color: "var(--text-3)",
          }}
        >
          Loading filtered data...
        </div>
      )}

      {/* Hero */}
      <div className="hero">
        <div className="hero-block">
          <div className="hero-eyebrow">Games Played</div>
          <div className="hero-number">{stats.gp}</div>
          <div className="hero-sub">
            {stats.record} · {pct(stats.winPct, 0)} win rate
          </div>
        </div>
        <div className="hero-divider" />
        <div className="hero-block">
          <div className="hero-eyebrow">Shots Faced</div>
          <div className="hero-number accent">{stats.totalSOG}</div>
          <div className="hero-sub">
            {fmt(stats.avgSOG, 1)} avg per 60 · {stats.totalSV} saves
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="stat-strip">
        <div className="stat-cell has-bar">
          <div className="stat-cell-label">SV%</div>
          <div className="stat-cell-value">{svPctFmt(stats.svPct)}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">GAA</div>
          <div className="stat-cell-value">{fmt(stats.gaa, 2)}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Record</div>
          <div className="stat-cell-value">{stats.record}</div>
          <div className="stat-cell-sub">W-RL-OTL</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">GSAx</div>
          <div className={`stat-cell-value ${gsaxClass}`}>
            {gsax != null ? signed(gsax, 4) : "—"}
          </div>
          <div className="stat-cell-sub">SV% − xSV%</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Shutouts</div>
          <div className="stat-cell-value">
            {games.filter((g) => g.ga === 0 && g.started).length}
          </div>
        </div>
      </div>

      {/* ═══════════════ SIMPLE VIEW ═══════════════ */}
      {view === "simple" && (
        <>
          {/* Charts row 1 */}
          <div className="chart-row two section-gap">
            <ChartCard title="SV% vs Expected">
              <SVGLineChart data={svPctPerGame} />
            </ChartCard>

            <ChartCard title="SV% Distribution">
              <SVGBarChart data={svPctBarData} />
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div className="chart-row equal section-gap">
            <ChartCard title="GA Distribution">
              <SVGHBarChart data={gaBarData} unitLabel="Games" labelWidth={30} />
            </ChartCard>

            <ChartCard title="Goals by Grade">
              <SVGGradeChart data={goalsByGradeData} />
            </ChartCard>
          </div>

          {/* Table row (3-column) */}
          <div className="table-row section-gap">
            {/* Recent Games — scrollable */}
            <div className="card scrollable-card" style={{ maxHeight: "380px" }}>
              <h4 className="card-title">Recent Games</h4>
              <div className="card-underline" />
              <div className="scroll-area">
                <table className="bold-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opp</th>
                      <th>Res</th>
                      <th className="num">Score</th>
                      <th className="num">SV%</th>
                      <th className="num">GA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGames.map((g) => (
                      <tr key={g.id}>
                        <td style={{ fontSize: "11px", color: "var(--text-2)" }}>
                          {formatDate(g.date)}
                        </td>
                        <td style={{ fontWeight: 500 }}>{g.opponent}</td>
                        <td className={resultCellClass(g)}>
                          {resultLabel(g)}
                        </td>
                        <td className="num">{g.score}</td>
                        <td className="num">{svPctFmt(g.sv_pct)}</td>
                        <td className="num">{g.ga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Situational Splits — V3 artifact layout */}
            <div className="card">
              <h4 className="card-title">Situational Splits</h4>
              <div className="card-underline" />

              {/* Home / Away sub-block */}
              <div className="sub-block">
                <div className="sub-label">Home / Away</div>
                <table className="sit-table">
                  <thead>
                    <tr>
                      <td className="rlabel"></td>
                      <td>Home</td>
                      <td>Away</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="rlabel">Record</td>
                      <td className="num">{stats.homeRecord}</td>
                      <td className="num">{stats.awayRecord}</td>
                    </tr>
                    <tr>
                      <td className="rlabel">SV%</td>
                      <td className="num">{svPctFmt(stats.svPctHome)}</td>
                      <td className="num">{svPctFmt(stats.svPctAway)}</td>
                    </tr>
                    <tr>
                      <td className="rlabel">GAA</td>
                      <td className="num">{fmt(stats.gaaHome, 2)}</td>
                      <td className="num">{fmt(stats.gaaAway, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* High / Low Shot Games sub-block */}
              <div className="sub-block">
                <div className="sub-label">High / Low Shot Games</div>
                <table className="sit-table">
                  <thead>
                    <tr>
                      <td className="rlabel"></td>
                      <td>&gt;35 SOG</td>
                      <td>&lt;20 SOG</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="rlabel">Games</td>
                      <td className="num">{stats.highShotGames}</td>
                      <td className="num">{stats.lowShotGames}</td>
                    </tr>
                    <tr>
                      <td className="rlabel">SV%</td>
                      <td className="num">{svPctFmt(stats.svPctHighShot)}</td>
                      <td className="num">{svPctFmt(stats.svPctLowShot)}</td>
                    </tr>
                    <tr>
                      <td className="rlabel">GAA</td>
                      <td className="num">{fmt(stats.gaaHighShot, 2)}</td>
                      <td className="num">{fmt(stats.gaaLowShot, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actual vs Expected + TSA */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
              {/* Actual vs Expected */}
              <div className="card">
                <h4 className="card-title">Actual vs Expected</h4>
                <div className="card-underline" />
                <table className="bold-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="num">Act</th>
                      <th className="num">Exp</th>
                      <th className="num">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--text-2)" }}>SV%</td>
                      <td className="num">{svPctFmt(stats.svPct)}</td>
                      <td className="num">{svPctFmt(stats.xSvPct)}</td>
                      <td className={`num ${deltaClass(stats.svPctMinusXSvPct)}`} style={{ fontWeight: 600 }}>
                        {signed(stats.svPctMinusXSvPct, 4)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-2)" }}>GAA</td>
                      <td className="num">{fmt(stats.gaa, 2)}</td>
                      <td className="num">{fmt(stats.xGAA, 2)}</td>
                      <td
                        className={`num ${deltaClass(
                          stats.xGAA != null && stats.gaa != null
                            ? stats.xGAA - stats.gaa
                            : null,
                        )}`}
                        style={{ fontWeight: 600 }}
                      >
                        {stats.xGAA != null && stats.gaa != null
                          ? signed(stats.xGAA - stats.gaa, 2)
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-2)" }}>GA</td>
                      <td className="num">{stats.totalGA}</td>
                      <td className="num">
                        {stats.totalXGA != null
                          ? fmt(stats.totalXGA, 1)
                          : "—"}
                      </td>
                      <td
                        className={`num ${deltaClass(stats.xgaMinusGA)}`}
                        style={{ fontWeight: 600 }}
                      >
                        {stats.xgaMinusGA != null
                          ? signed(stats.xgaMinusGA, 1)
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TSA Breakdown */}
              <div className="card">
                <h4 className="card-title">TSA Breakdown</h4>
                <div className="card-underline" />
                <div
                  style={{
                    width: "100%",
                    height: "28px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      flex: `${sogPct} 0 0%`,
                      background: "var(--primary)",
                    }}
                  />
                  <div
                    style={{
                      flex: `${sbPct} 0 0%`,
                      background: "var(--accent)",
                      opacity: 0.6,
                    }}
                  />
                  <div
                    style={{
                      flex: `${smPct} 0 0%`,
                      background: "var(--text-3)",
                    }}
                  />
                </div>
                <div className="tsa-legend">
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "var(--primary)",
                      }}
                    />
                    SOG {sogPct}%
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "var(--accent)",
                        opacity: 0.6,
                      }}
                    />
                    Blocked {sbPct}%
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "var(--text-3)",
                      }}
                    />
                    Missed {smPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bands */}
          <div className="bands">
            {/* Rebound Control */}
            <div className="band">
              <div className="band-title">Rebound Control</div>
              <div className="band-underline" />
              <div className="kv-row">
                <span className="kv-label">Control Rate</span>
                <span className="kv-value">{pct(stats.reboundControlRate)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Green / Red / Black</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {stats.totalReboundGreen} / {stats.totalReboundRed} /{" "}
                  {stats.totalReboundBlack}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Per Save</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {fmt(stats.reboundsPerSave, 3)}
                </span>
              </div>
            </div>

            {/* Glove Performance */}
            <div className="band">
              <div className="band-title">Glove Performance</div>
              <div className="band-underline" />
              <div className="kv-row">
                <span className="kv-label">Save Rate</span>
                <span className="kv-value">{pct(stats.gloveRate)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Green / Red / Black</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {stats.totalGloveGreen} / {stats.totalGloveRed} /{" "}
                  {stats.totalGloveBlack}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Freeze Rate</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {pct(stats.gloveFreezeRate)}
                </span>
              </div>
            </div>

            {/* Playmaking */}
            <div className="band">
              <div className="band-title">Playmaking</div>
              <div className="band-underline" />
              <div className="kv-row">
                <span className="kv-label">Retention Rate</span>
                <span className="kv-value">{pct(stats.playRetentionRate)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Green / Red / Black</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {stats.totalPlayGreen} / {stats.totalPlayRed} /{" "}
                  {stats.totalPlayBlack}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Per 60</span>
                <span className="kv-value" style={{ fontSize: "16px" }}>
                  {fmt(stats.playmakingPerGP, 2)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ DETAILED VIEW ═══════════════ */}
      {view === "detailed" && (
        <>
          {/* Row 1: Overall Stats + Grade Cards */}
          <div className="grid-2-wide section-gap">
            {/* Overall Stats */}
            <div className="card">
              <h4 className="card-title">Overall Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                {/* Top section */}
                <tbody>
                  <tr>
                    <td className="og-label">Total GP</td>
                    <td className="og-val">{stats.gp}</td>
                    <td className="og-sep" />
                    <td className="og-label">Record</td>
                    <td className="og-val">{stats.record}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Win%</td>
                    <td className="og-val">{pct(stats.winPct)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Home Record</td>
                    <td className="og-val">{stats.homeRecord}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Home / Away GP</td>
                    <td className="og-val">
                      {stats.homeGP} / {stats.awayGP}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">Away Record</td>
                    <td className="og-val">{stats.awayRecord}</td>
                  </tr>
                  <tr>
                    <td className="og-label">High Shot Games (&gt;35)</td>
                    <td className="og-val">{stats.highShotGames}</td>
                    <td className="og-sep" />
                    <td className="og-label">OT Record</td>
                    <td className="og-val">{stats.otRecord}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Low Shot Games (&lt;20)</td>
                    <td className="og-val">{stats.lowShotGames}</td>
                    <td className="og-sep" />
                    <td className="og-label">SO Record</td>
                    <td className="og-val">{stats.soRecord}</td>
                  </tr>

                  {/* Time on Ice */}
                  <tr>
                    <td className="og-section" colSpan={5}>Time on Ice</td>
                  </tr>
                  <tr>
                    <td className="og-label">TOI</td>
                    <td className="og-val">{stats.totalTOI}</td>
                    <td className="og-sep" />
                    <td className="og-label">AVG TOI When Started</td>
                    <td className="og-val">{stats.avgTOIStarted}</td>
                  </tr>
                  <tr>
                    <td className="og-label">AVG TOI Per Game</td>
                    <td className="og-val">{stats.avgTOIPerGame}</td>
                    <td className="og-sep" />
                    <td className="og-label">AVG TOI When Pulled</td>
                    <td className="og-val">{stats.avgTOIPulled}</td>
                  </tr>
                  <tr>
                    <td className="og-label"></td>
                    <td className="og-val"></td>
                    <td className="og-sep" />
                    <td className="og-label">AVG TOI Didn&apos;t Start</td>
                    <td className="og-val">{stats.avgTOIDidntStart}</td>
                  </tr>

                  {/* Games */}
                  <tr>
                    <td className="og-section" colSpan={5}>Games</td>
                  </tr>
                  <tr>
                    <td className="og-label">Games Started</td>
                    <td className="og-val">{stats.gamesStarted}</td>
                    <td className="og-sep" />
                    <td className="og-label">% of GP Started</td>
                    <td className="og-val">{pct(stats.pctGPStarted)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Games Pulled</td>
                    <td className="og-val">{stats.gamesPulled}</td>
                    <td className="og-sep" />
                    <td className="og-label">% of GS Pulled</td>
                    <td className="og-val">{pct(stats.pctGSPulled)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Games as Backup</td>
                    <td className="og-val">{stats.gamesAsBackup}</td>
                    <td className="og-sep" />
                    <td className="og-label">% of GPs as Backup</td>
                    <td className="og-val">{pct(stats.pctGPAsBackup)}</td>
                  </tr>

                  {/* Overtime / Shootout */}
                  <tr>
                    <td className="og-section" colSpan={5}>Overtime / Shootout</td>
                  </tr>
                  <tr>
                    <td className="og-label"># of OT Games</td>
                    <td className="og-val">{stats.otGames}</td>
                    <td className="og-sep" />
                    <td className="og-label"># of SO Games</td>
                    <td className="og-val">{stats.soGames}</td>
                  </tr>
                  <tr>
                    <td className="og-label">% of GP with OT</td>
                    <td className="og-val">{pct(stats.pctGPWithOT)}</td>
                    <td className="og-sep" />
                    <td className="og-label">% of OT with SO</td>
                    <td className="og-val">{pct(stats.pctOTWithSO)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total OT Time</td>
                    <td className="og-val">{stats.totalOTTime ?? "—"}</td>
                    <td className="og-sep" />
                    <td className="og-label">Average OT Time</td>
                    <td className="og-val">{stats.avgOTTime ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Longest OT Time</td>
                    <td className="og-val">{stats.longestOTTime ?? "—"}</td>
                    <td className="og-sep" />
                    <td className="og-label"></td>
                    <td className="og-val"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grade Cards (2×2 grid) — no worst highlighting */}
            <div className="grade-grid">
              {(
                [
                  { key: "A+", data: stats.gradeAplus },
                  { key: "A", data: stats.gradeA },
                  { key: "B", data: stats.gradeB },
                  { key: "C", data: stats.gradeC },
                ] as const
              ).map((grade) => (
                <div key={grade.key} className="grade-card">
                  <div className="grade-card-title">{grade.key}</div>
                  <div style={{ marginTop: "12px" }}>
                    <div className="kv-row">
                      <span className="kv-label">SV%</span>
                      <span className="kv-value" style={{ fontSize: "16px" }}>
                        {svPctFmt(grade.data.svPct)}
                      </span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Goals</span>
                      <span className="kv-value" style={{ fontSize: "16px" }}>
                        {grade.data.goals}
                      </span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Shots</span>
                      <span className="kv-value" style={{ fontSize: "16px" }}>
                        {grade.data.shots}
                      </span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">% of Total GA</span>
                      <span className="kv-value" style={{ fontSize: "16px" }}>
                        {pct(grade.data.gaVsTotalGA)}
                      </span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">% of Total SOG</span>
                      <span className="kv-value" style={{ fontSize: "16px" }}>
                        {pct(grade.data.sogVsTotalSOG)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Shot Stats + GA Stats */}
          <div className="grid-2 section-gap">
            {/* Shot Stats */}
            <div className="card">
              <h4 className="card-title">Shot Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Total SOG</td>
                    <td className="og-val">{stats.totalSOG}</td>
                    <td className="og-sep" />
                    <td className="og-label">Total TSA</td>
                    <td className="og-val">{stats.totalTSA}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total SV</td>
                    <td className="og-val">{stats.totalSV}</td>
                    <td className="og-sep" />
                    <td className="og-label">% TSA on Target</td>
                    <td className="og-val">{pct(stats.pctTSAOnTarget)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">SV%</td>
                    <td className="og-val">{svPctFmt(stats.svPct)}</td>
                    <td className="og-sep" />
                    <td className="og-label">xSV%</td>
                    <td className="og-val">{svPctFmt(stats.xSvPct)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">SV% − xSV%</td>
                    <td className={`og-val ${deltaClass(stats.svPctMinusXSvPct)}`}>
                      {signed(stats.svPctMinusXSvPct, 4)}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">AVG SOG /60</td>
                    <td className="og-val">{fmt(stats.avgSOG, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-section" colSpan={5}>SV% Splits</td>
                  </tr>
                  <tr>
                    <td className="og-label">Home SV%</td>
                    <td className="og-val">{svPctFmt(stats.svPctHome)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Away SV%</td>
                    <td className="og-val">{svPctFmt(stats.svPctAway)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">High-Shot SV%</td>
                    <td className="og-val">{svPctFmt(stats.svPctHighShot)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Low-Shot SV%</td>
                    <td className="og-val">{svPctFmt(stats.svPctLowShot)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Home xSV%</td>
                    <td className="og-val">{svPctFmt(stats.xSvPctHome)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Away xSV%</td>
                    <td className="og-val">{svPctFmt(stats.xSvPctAway)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Home GSAx</td>
                    <td className={`og-val ${deltaClass(stats.svPctMinusXSvPctHome)}`}>
                      {signed(stats.svPctMinusXSvPctHome, 4)}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">Away GSAx</td>
                    <td className={`og-val ${deltaClass(stats.svPctMinusXSvPctAway)}`}>
                      {signed(stats.svPctMinusXSvPctAway, 4)}
                    </td>
                  </tr>
                  <tr>
                    <td className="og-section" colSpan={5}>Shot Blocks &amp; Misses</td>
                  </tr>
                  <tr>
                    <td className="og-label">Shots Blocked</td>
                    <td className="og-val">{stats.totalSB}</td>
                    <td className="og-sep" />
                    <td className="og-label">% TSA Blocked</td>
                    <td className="og-val">{pct(stats.sbPct)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Shots Missed</td>
                    <td className="og-val">{stats.totalSM}</td>
                    <td className="og-sep" />
                    <td className="og-label">% TSA Missed</td>
                    <td className="og-val">{pct(stats.smPct)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* GA Stats */}
            <div className="card">
              <h4 className="card-title">GA Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Total GA</td>
                    <td className="og-val">{stats.totalGA}</td>
                    <td className="og-sep" />
                    <td className="og-label">Total xGA</td>
                    <td className="og-val">
                      {stats.totalXGA != null ? fmt(stats.totalXGA, 1) : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="og-label">GAA</td>
                    <td className="og-val">{fmt(stats.gaa, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label">xGAA</td>
                    <td className="og-val">{fmt(stats.xGAA, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">xGA − GA</td>
                    <td className={`og-val ${deltaClass(stats.xgaMinusGA)}`}>
                      {stats.xgaMinusGA != null
                        ? signed(stats.xgaMinusGA, 1)
                        : "—"}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">xGAA − GAA</td>
                    <td className={`og-val ${deltaClass(stats.xGAA != null && stats.gaa != null ? stats.xGAA - stats.gaa : null)}`}>
                      {stats.xGAA != null && stats.gaa != null
                        ? signed(stats.xGAA - stats.gaa, 2)
                        : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="og-section" colSpan={5}>GAA Splits</td>
                  </tr>
                  <tr>
                    <td className="og-label">GAA 1st 5 Mins</td>
                    <td className="og-val">{fmt(stats.gaaFirst5Mins, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label">GAA Last 5 Mins</td>
                    <td className="og-val">{fmt(stats.gaaLast5Mins, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">GAA 1st 5 Shots</td>
                    <td className="og-val">{fmt(stats.gaaFirst5Shots, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label"></td>
                    <td className="og-val"></td>
                  </tr>
                  <tr>
                    <td className="og-label">Home GAA</td>
                    <td className="og-val">{fmt(stats.gaaHome, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Away GAA</td>
                    <td className="og-val">{fmt(stats.gaaAway, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Home xGAA − GAA</td>
                    <td className={`og-val ${deltaClass(stats.xGAAMinusGAAHome)}`}>
                      {signed(stats.xGAAMinusGAAHome, 2)}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">Away xGAA − GAA</td>
                    <td className={`og-val ${deltaClass(stats.xGAAMinusGAAAway)}`}>
                      {signed(stats.xGAAMinusGAAAway, 2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="og-label">High-Shot GAA</td>
                    <td className="og-val">{fmt(stats.gaaHighShot, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Low-Shot GAA</td>
                    <td className="og-val">{fmt(stats.gaaLowShot, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-section" colSpan={5}>PK / PP GA</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK GA</td>
                    <td className="og-val">{stats.pkGA}</td>
                    <td className="og-sep" />
                    <td className="og-label">PP GA</td>
                    <td className="og-val">{stats.ppGA}</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK GAA</td>
                    <td className="og-val">{fmt(stats.pkGAA, 2)}</td>
                    <td className="og-sep" />
                    <td className="og-label">PP GAA</td>
                    <td className="og-val">{fmt(stats.ppGAA, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK GA vs GA</td>
                    <td className="og-val">{pct(stats.pkGAVsGA)}</td>
                    <td className="og-sep" />
                    <td className="og-label">AVG GA per PK</td>
                    <td className="og-val">{fmt(stats.avgGAPerPK, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Charts (SOG Distribution + Shots by Grade only) */}
          <div className="chart-row equal section-gap">
            <ChartCard title="SOG Distribution">
              <SVGBarChart data={sogBarData} />
            </ChartCard>

            <ChartCard title="Shots by Grade">
              <SVGBarChart data={shotsByGradeBarData} />
            </ChartCard>
          </div>

          {/* Row 4: Rebound + Glove */}
          <div className="grid-2 section-gap">
            <div className="card">
              <h4 className="card-title">Rebound Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Control Rate</td>
                    <td className="og-val">{pct(stats.reboundControlRate)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Per Save</td>
                    <td className="og-val">{fmt(stats.reboundsPerSave, 3)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Green</td>
                    <td className="og-val">{stats.totalReboundGreen}</td>
                    <td className="og-sep" />
                    <td className="og-label">Green /60</td>
                    <td className="og-val">{fmt(stats.avgReboundGreen, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Red</td>
                    <td className="og-val">{stats.totalReboundRed}</td>
                    <td className="og-sep" />
                    <td className="og-label">Red /60</td>
                    <td className="og-val">{fmt(stats.avgReboundRed, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Black</td>
                    <td className="og-val">{stats.totalReboundBlack}</td>
                    <td className="og-sep" />
                    <td className="og-label">Black /60</td>
                    <td className="og-val">{fmt(stats.avgReboundBlack, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h4 className="card-title">Glove Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Save Rate</td>
                    <td className="og-val">{pct(stats.gloveRate)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Freeze Rate</td>
                    <td className="og-val">{pct(stats.gloveFreezeRate)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Glove Shots</td>
                    <td className="og-val">{stats.totalGloveShots}</td>
                    <td className="og-sep" />
                    <td className="og-label">Glove /60</td>
                    <td className="og-val">{fmt(stats.gloveShotsPerGP, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Green</td>
                    <td className="og-val">{stats.totalGloveGreen}</td>
                    <td className="og-sep" />
                    <td className="og-label">Green /60</td>
                    <td className="og-val">{fmt(stats.avgGloveGreen, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Red</td>
                    <td className="og-val">{stats.totalGloveRed}</td>
                    <td className="og-sep" />
                    <td className="og-label">Red /60</td>
                    <td className="og-val">{fmt(stats.avgGloveRed, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Black</td>
                    <td className="og-val">{stats.totalGloveBlack}</td>
                    <td className="og-sep" />
                    <td className="og-label">Black /60</td>
                    <td className="og-val">{fmt(stats.avgGloveBlack, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Playmaking + PK */}
          <div className="grid-2 section-gap">
            <div className="card">
              <h4 className="card-title">Playmaking Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Retention Rate</td>
                    <td className="og-val">{pct(stats.playRetentionRate)}</td>
                    <td className="og-sep" />
                    <td className="og-label">Playmaking /60</td>
                    <td className="og-val">{fmt(stats.playmakingPerGP, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Green</td>
                    <td className="og-val">{stats.totalPlayGreen}</td>
                    <td className="og-sep" />
                    <td className="og-label">Green /60</td>
                    <td className="og-val">{fmt(stats.avgPlayGreen, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Red</td>
                    <td className="og-val">{stats.totalPlayRed}</td>
                    <td className="og-sep" />
                    <td className="og-label">Red /60</td>
                    <td className="og-val">{fmt(stats.avgPlayRed, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total Black</td>
                    <td className="og-val">{stats.totalPlayBlack}</td>
                    <td className="og-sep" />
                    <td className="og-label">Black /60</td>
                    <td className="og-val">{fmt(stats.avgPlayBlack, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h4 className="card-title">PK Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Total PKs</td>
                    <td className="og-val">{stats.pkCount}</td>
                    <td className="og-sep" />
                    <td className="og-label">AVG PKs /60</td>
                    <td className="og-val">{fmt(stats.avgPKCount, 2)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK SOG</td>
                    <td className="og-val">{stats.pkSOG}</td>
                    <td className="og-sep" />
                    <td className="og-label">PK TSA</td>
                    <td className="og-val">{stats.pkTSA}</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK SOG vs SOG</td>
                    <td className="og-val">{pct(stats.pkSOGVsSOG)}</td>
                    <td className="og-sep" />
                    <td className="og-label">PK TSA vs TSA</td>
                    <td className="og-val">{pct(stats.pkTSAVsTSA)}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Total PK Time</td>
                    <td className="og-val">{stats.totalPKTime ?? "—"}</td>
                    <td className="og-sep" />
                    <td className="og-label">PK Time /60</td>
                    <td className="og-val">{stats.pkTimePerGP ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="og-label">PK Time per PK</td>
                    <td className="og-val">{stats.pkTimePerPK ?? "—"}</td>
                    <td className="og-sep" />
                    <td className="og-label">Pipes</td>
                    <td className="og-val">{stats.totalPipes}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 6: Charts — Times Pulled + Shot Dist + Shot Volume */}
          <div className="chart-row three section-gap">
            <ChartCard title="Times Pulled by Period">
              <SVGBarChart data={pulledBarData} unitLabel="Pulled" height={340} compact />
            </ChartCard>

            <ChartCard title="Shot Distribution by Period">
              <SVGGroupedBarChart
                data={shotDistGroupedData}
                height={340}
                compact
                legend={[
                  { key: "P1", color: PERIOD_COLORS[0], label: "P1" },
                  { key: "P2", color: PERIOD_COLORS[1], label: "P2" },
                  { key: "P3", color: PERIOD_COLORS[2], label: "P3" },
                ]}
              />
            </ChartCard>

            <ChartCard title="High/Low/Regular Shot Games">
              <SVGBarChart data={shotVolumeBarData} height={340} compact />
            </ChartCard>
          </div>

          {/* Row 7: Past Games Performance + B2B Stats side by side */}
          <div className="past-b2b-grid section-gap">
            {/* Past Games Performance — 3-column layout with separators */}
            <div className="card">
              <h4 className="card-title">Past Games Performance</h4>
              <div className="card-underline" />
              <div className="perf-grid">
                {/* Left: Rolling Windows */}
                <div>
                  <div className="section-eyebrow">Rolling Windows</div>
                  <table className="bold-table rolling-table">
                    <thead>
                      <tr>
                        <th>Window</th>
                        <th className="num">SV%</th>
                        <th className="num">GAA</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ color: "var(--text-2)" }}>Last 5</td>
                        <td className="num">{svPctFmt(stats.pastGames.last5SvPct)}</td>
                        <td className="num">{fmt(stats.pastGames.last5GAA, 2)}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-2)" }}>Last 10</td>
                        <td className="num">{svPctFmt(stats.pastGames.last10SvPct)}</td>
                        <td className="num">{fmt(stats.pastGames.last10GAA, 2)}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-2)" }}>Last 20</td>
                        <td className="num">{svPctFmt(stats.pastGames.last20SvPct)}</td>
                        <td className="num">{fmt(stats.pastGames.last20GAA, 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Separator */}
                <div className="perf-sep" />

                {/* Center: Most Saves */}
                <div>
                  <div className="section-eyebrow">Most Saves</div>
                  <table className="bold-table perf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>SV</th>
                        <th>Opp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.pastGames.topSaves.map((g, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--text-3)" }}>{i + 1}</td>
                          <td style={{ fontSize: "11px", color: "var(--text-2)" }}>
                            {formatDate(g.date)}
                          </td>
                          <td style={{ fontWeight: 600 }}>{g.saves}</td>
                          <td>{g.opponent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Separator */}
                <div className="perf-sep" />

                {/* Right: Most GA */}
                <div>
                  <div className="section-eyebrow">Most GA</div>
                  <table className="bold-table perf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>GA</th>
                        <th>Opp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.pastGames.topGA.map((g, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--text-3)" }}>{i + 1}</td>
                          <td style={{ fontSize: "11px", color: "var(--text-2)" }}>
                            {formatDate(g.date)}
                          </td>
                          <td style={{ fontWeight: 600 }}>{g.ga}</td>
                          <td>{g.opponent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* B2B Stats — narrow vertical card */}
            {stats.b2bGP > 0 && (
              <div className="card">
                <h4 className="card-title">Back-to-Back Stats</h4>
                <div className="card-underline" />
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div className="kv-row">
                    <span className="kv-label">Total B2B Games</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{stats.b2bGP}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Record</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{stats.b2bRecord}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Win%</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{pct(stats.b2bWinPct)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">SV%</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{svPctFmt(stats.b2bSvPct)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">GAA</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{fmt(stats.b2bGAA, 2)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Rebound Control</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{pct(stats.b2bReboundControlRate)}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Pulled B2B / Total</span>
                    <span className="kv-value" style={{ fontSize: "16px" }}>{stats.b2bPulledVsTotal ?? "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conditional: Playoff Stats */}
          {stats.playoffGP > 0 && (
            <div className="card section-gap">
              <h4 className="card-title">Playoff Stats</h4>
              <div className="card-underline" />
              <table className="overall-grid">
                <tbody>
                  <tr>
                    <td className="og-label">Playoff GP</td>
                    <td className="og-val">{stats.playoffGP}</td>
                    <td className="og-sep" />
                    <td className="og-label">Record</td>
                    <td className="og-val">{stats.playoffRecord}</td>
                  </tr>
                  <tr>
                    <td className="og-label">Win%</td>
                    <td className="og-val">
                      {stats.playoffGP > 0
                        ? pct(stats.playoffWins / stats.playoffGP)
                        : "—"}
                    </td>
                    <td className="og-sep" />
                    <td className="og-label">Losses</td>
                    <td className="og-val">{stats.playoffLosses}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="footer">Mikhail Yegorov · #40</div>
    </div>
  );
}
