"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { GameComputed, GamePeriodComputed } from "@/lib/types/database";

interface GameLogClientProps {
  games: GameComputed[];
  periods: GamePeriodComputed[];
  seasons: string[];
}

function formatDate(val: string): string {
  const d = new Date(val);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** SV% style: .923 */
function fmtSvPct(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(3).replace(/^0/, "");
}

/** Percentage style: 21.4% */
function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return (n * 100).toFixed(1) + "%";
}

/** Signed SV% style: +.033 */
function fmtSvPctSigned(n: number | null): string {
  if (n == null) return "—";
  const s = Math.abs(n).toFixed(3).replace(/^0/, "");
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtNumSigned(n: number | null): string {
  if (n == null) return "—";
  const s = Number.isInteger(n)
    ? String(Math.abs(n))
    : Math.abs(n).toFixed(2);
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

function fmtBool(v: boolean): string {
  return v ? "✓" : "✗";
}

function deltaClass(n: number | null): string {
  if (n == null || n === 0) return "";
  return n > 0 ? "delta-good" : "delta-bad";
}

// Column definitions for the game-level headers
const GAME_HEADERS = [
  "",        // 0  expand icon
  "Date",    // 1
  "Opponent",// 2
  "Period",  // 3
  "TOI",     // 4
  "Score",   // 5
  "W/L",     // 6
  "H/A",     // 7
  "B2B",     // 8
  "OT",      // 9
  "SO",      // 10
  "Started", // 11
  "Pulled",  // 12
  "xGA",     // 13  gap-left
  "GA",      // 14
  "xGA-GA",  // 15  gap-right
  "GA 1st5", // 16
  "GA 1st5m",// 17
  "GA last5m",// 18
  "A+ GA",   // 19
  "A GA",    // 20
  "B GA",    // 21
  "C GA",    // 22
  "PK GA",   // 23
  "PP GA",   // 24
  "TSA",     // 25
  "SB",      // 26
  "SM",      // 27
  "SB%",     // 28
  "SM%",     // 29
  "SOG",     // 30
  "SV",      // 31
  "SV%",     // 32
  "xSV%",    // 33
  "SV%-xSV%",// 34
  "A+ SA",   // 35
  "A SA",    // 36
  "B SA",    // 37
  "C SA",    // 38
  "Pipes",   // 39
  "PIM",     // 40
  "PK #",    // 41
  "PK TSA",  // 42
  "PK SOG",  // 43
  "PK SA%",  // 44
  "PK SOG%", // 45
  "Reb G/R/B", // 46
  "Reb Rate",  // 47
  "Glv G/R/B", // 48
  "Glv Rate",  // 49
  "Glv Freeze",// 50
  "PM G/R/B",  // 51
  "PM Rate",   // 52
];

// Left-aligned columns: Date, Opponent
const LEFT_COLS = new Set([1, 2]);
// Extra left padding (gap before xGA group)
const GAP_L_COLS = new Set([13]);
// Extra right padding (gap after xGA-GA group)
const GAP_R_COLS = new Set([15]);
// Wide column: Period (so "Period 1" etc. fits on one line)
const WIDE_COLS = new Set([3]);

function thClass(i: number): string {
  const parts: string[] = [];
  if (LEFT_COLS.has(i)) parts.push("gl-left");
  if (GAP_L_COLS.has(i)) parts.push("gl-gap-l");
  if (GAP_R_COLS.has(i)) parts.push("gl-gap-r");
  if (WIDE_COLS.has(i)) parts.push("gl-wide");
  return parts.join(" ");
}

function tdClass(i: number): string {
  const parts: string[] = [];
  if (LEFT_COLS.has(i)) parts.push("gl-left");
  if (GAP_L_COLS.has(i)) parts.push("gl-gap-l");
  if (GAP_R_COLS.has(i)) parts.push("gl-gap-r");
  return parts.join(" ");
}

function GameRow({
  game,
  expanded,
  onToggle,
}: {
  game: GameComputed;
  expanded: boolean;
  onToggle: () => void;
}) {
  const resultClass = game.win == null ? "" : game.win ? "res-W" : "res-L";
  const xgaDelta = game.xga_minus_ga;

  return (
    <tr className="expand-row" onClick={onToggle}>
      <td>
        {expanded ? (
          <ChevronDown size={14} style={{ color: "var(--text-3)" }} />
        ) : (
          <ChevronRight size={14} style={{ color: "var(--text-3)" }} />
        )}
      </td>
      <td className="gl-left" style={{ whiteSpace: "nowrap" }}>{formatDate(game.date)}</td>
      <td className="gl-left" style={{ fontWeight: 500 }}>{game.opponent}</td>
      <td style={{ fontWeight: 600, color: "var(--accent)" }}>Total</td>
      <td>{game.toi}</td>
      <td>{game.score}</td>
      <td className={resultClass} style={{ fontWeight: 700 }}>
        {game.win == null ? "—" : game.win ? "W" : "L"}
      </td>
      <td>{game.home_away}</td>
      <td>{fmtBool(game.b2b)}</td>
      <td>{fmtBool(game.ot)}</td>
      <td>{fmtBool(game.so)}</td>
      <td>{fmtBool(game.started)}</td>
      <td>{fmtBool(game.pulled)}</td>
      <td className="gl-gap-l">{fmtNum(game.xga)}</td>
      <td>{fmtNum(game.ga)}</td>
      <td className={`gl-gap-r ${deltaClass(xgaDelta)}`} style={{ fontWeight: 600 }}>{fmtNumSigned(xgaDelta)}</td>
      <td>{fmtNum(game.ga_first_5_shots)}</td>
      <td>{fmtNum(game.ga_first_5_mins)}</td>
      <td>{fmtNum(game.ga_last_5_mins)}</td>
      <td>{fmtNum(game.grade_aplus_goals)}</td>
      <td>{fmtNum(game.grade_a_goals)}</td>
      <td>{fmtNum(game.grade_b_goals)}</td>
      <td>{fmtNum(game.grade_c_goals)}</td>
      <td>{fmtNum(game.pk_ga)}</td>
      <td>{fmtNum(game.pp_ga)}</td>
      <td>{fmtNum(game.tsa)}</td>
      <td>{fmtNum(game.sb)}</td>
      <td>{fmtNum(game.sm)}</td>
      <td>{fmtPct(game.sb_vs_tsa)}</td>
      <td>{fmtPct(game.sm_vs_tsa)}</td>
      <td>{fmtNum(game.sog)}</td>
      <td>{fmtNum(game.sv)}</td>
      <td>{fmtSvPct(game.sv_pct)}</td>
      <td>{fmtSvPct(game.xsv_pct)}</td>
      <td className={deltaClass(game.sv_pct_minus_xsv_pct)} style={{ fontWeight: 600 }}>{fmtSvPctSigned(game.sv_pct_minus_xsv_pct)}</td>
      <td>{fmtNum(game.grade_aplus_shots)}</td>
      <td>{fmtNum(game.grade_a_shots)}</td>
      <td>{fmtNum(game.grade_b_shots)}</td>
      <td>{fmtNum(game.grade_c_shots)}</td>
      <td>{fmtNum(game.pipes)}</td>
      <td>{game.pim_total ?? "—"}</td>
      <td>{fmtNum(game.pk_count)}</td>
      <td>{fmtNum(game.pk_tsa)}</td>
      <td>{fmtNum(game.pk_sog)}</td>
      <td>{fmtPct(game.pk_sa_vs_tsa)}</td>
      <td>{fmtPct(game.pk_sog_vs_sog)}</td>
      <td>{`${game.rebound_green}/${game.rebound_red}/${game.rebound_black}`}</td>
      <td>{fmtPct(game.rebound_control_rate)}</td>
      <td>{`${game.glove_green}/${game.glove_red}/${game.glove_black}`}</td>
      <td>{fmtPct(game.glove_save_rate)}</td>
      <td>{fmtPct(game.glove_freeze_rate)}</td>
      <td>{`${game.playmaking_green}/${game.playmaking_red}/${game.playmaking_black}`}</td>
      <td>{fmtPct(game.playmaking_retention_rate)}</td>
    </tr>
  );
}

function PeriodRow({ period }: { period: GamePeriodComputed }) {
  return (
    <tr className="period-row">
      <td></td>
      {/* Date */}
      <td></td>
      {/* Opponent */}
      <td></td>
      {/* Period */}
      <td style={{ fontStyle: "italic", whiteSpace: "nowrap" }}>{period.period}</td>
      {/* TOI */}
      <td>{period.toi ?? "—"}</td>
      {/* Score */}
      <td>{period.score ?? "—"}</td>
      {/* W/L */}
      <td></td>
      {/* H/A */}
      <td></td>
      {/* B2B */}
      <td></td>
      {/* OT */}
      <td></td>
      {/* SO */}
      <td></td>
      {/* Started */}
      <td>{fmtBool(period.started)}</td>
      {/* Pulled */}
      <td>{fmtBool(period.pulled)}</td>
      {/* xGA */}
      <td className="gl-gap-l"></td>
      {/* GA */}
      <td>{fmtNum(period.ga)}</td>
      {/* xGA-GA */}
      <td className="gl-gap-r"></td>
      {/* GA 1st5 shots */}
      <td></td>
      {/* GA 1st5 min */}
      <td></td>
      {/* GA last5 min */}
      <td></td>
      {/* Grade goals */}
      <td>{fmtNum(period.grade_aplus_goals)}</td>
      <td>{fmtNum(period.grade_a_goals)}</td>
      <td>{fmtNum(period.grade_b_goals)}</td>
      <td>{fmtNum(period.grade_c_goals)}</td>
      {/* PK/PP GA */}
      <td>{fmtNum(period.pk_ga)}</td>
      <td></td>
      {/* TSA, SB, SM */}
      <td>{fmtNum(period.tsa)}</td>
      <td>{fmtNum(period.sb)}</td>
      <td>{fmtNum(period.sm)}</td>
      {/* SB%, SM% */}
      <td>{fmtPct(period.sb_vs_tsa)}</td>
      <td>{fmtPct(period.sm_vs_tsa)}</td>
      {/* SOG, SV, SV% */}
      <td>{fmtNum(period.sog)}</td>
      <td>{fmtNum(period.sv)}</td>
      <td>{fmtSvPct(period.sv_pct)}</td>
      {/* xSV%, SV%-xSV% */}
      <td></td>
      <td></td>
      {/* Grade shots */}
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      {/* Pipes */}
      <td></td>
      {/* PIM */}
      <td>{period.pim_total ?? ""}</td>
      {/* PK */}
      <td>{fmtNum(period.pk_count)}</td>
      <td>{fmtNum(period.pk_tsa)}</td>
      <td>{fmtNum(period.pk_sog)}</td>
      <td>{fmtPct(period.pk_sa_vs_tsa)}</td>
      <td>{fmtPct(period.pk_sog_vs_sog)}</td>
      {/* Rebound/Glove/Playmaking */}
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  );
}

export default function GameLogClient({
  games,
  periods,
  seasons,
}: GameLogClientProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const safeSeasons = seasons ?? [];
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([...safeSeasons]);
  const [appliedFilters, setAppliedFilters] = useState<{
    seasons: string[];
    dateFrom: string;
    dateTo: string;
  }>({ seasons: [...safeSeasons], dateFrom: "", dateTo: "" });

  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (!appliedFilters.seasons.includes(g.season ?? "")) return false;
      if (appliedFilters.dateFrom && g.date < appliedFilters.dateFrom)
        return false;
      if (appliedFilters.dateTo && g.date > appliedFilters.dateTo) return false;
      return true;
    });
  }, [games, appliedFilters]);

  const periodsByGame = useMemo(() => {
    const map = new Map<string, GamePeriodComputed[]>();
    for (const p of periods) {
      const list = map.get(p.game_id) || [];
      list.push(p);
      map.set(p.game_id, list);
    }
    const periodOrder = ["Period 1", "Period 2", "Period 3", "OT", "SO"];
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          periodOrder.indexOf(a.period) - periodOrder.indexOf(b.period),
      );
    }
    return map;
  }, [periods]);

  function toggleRow(gameId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  }

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season],
    );
  };

  const handleApply = useCallback(() => {
    setAppliedFilters({ seasons: selectedSeasons, dateFrom, dateTo });
  }, [selectedSeasons, dateFrom, dateTo]);

  const handleReset = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setSelectedSeasons([...safeSeasons]);
    setAppliedFilters({ seasons: [...safeSeasons], dateFrom: "", dateTo: "" });
    setFilterOpen(false);
  }, [safeSeasons]);

  return (
    <div className="wrap">
      <div className="card" style={{ marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 className="card-title">Game Log</h2>
            <div className="card-underline"></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                fontWeight: 400,
              }}
            >
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
        </div>

        {/* Filter panel */}
        <div className={`filter-panel ${filterOpen ? "open" : ""}`}>
          <div className="filter-inner">
            <div>
              <div className="filter-label">From</div>
              <input
                type="date"
                className="filter-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onClick={(e) => {
                  try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {}
                }}
              />
            </div>
            <div>
              <div className="filter-label">To</div>
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
            <div>
              <div className="filter-label">Season</div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                {safeSeasons.map((season) => (
                  <label
                    key={season}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--text-1)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season)}
                      onChange={() => toggleSeason(season)}
                    />
                    {season}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button className="apply-btn" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="game-log-wrap">
          <table className="bold-table game-log-table" style={{ minWidth: 2400 }}>
            <thead>
              <tr>
                {GAME_HEADERS.map((h, i) => (
                  <th
                    key={i}
                    className={thClass(i)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {filteredGames.map((game) => {
              const isExpanded = expandedRows.has(game.id);
              const gamePeriods = periodsByGame.get(game.id) || [];
              return (
                <tbody key={game.id}>
                  <GameRow
                    game={game}
                    expanded={isExpanded}
                    onToggle={() => toggleRow(game.id)}
                  />
                  {isExpanded &&
                    gamePeriods.map((p) => (
                      <PeriodRow key={p.id} period={p} />
                    ))}
                </tbody>
              );
            })}
            {filteredGames.length === 0 && (
              <tbody>
                <tr>
                  <td
                    colSpan={GAME_HEADERS.length}
                    style={{
                      textAlign: "center",
                      color: "var(--text-3)",
                      padding: "32px 0",
                    }}
                  >
                    No games match the selected filters
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
