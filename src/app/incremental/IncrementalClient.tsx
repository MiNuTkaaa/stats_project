"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import ChartCard from "@/components/ChartCard";
import type { IncrementalWindow } from "./page";

interface IncrementalClientProps {
  windows5: IncrementalWindow[];
  windows10: IncrementalWindow[];
  totalGames: number;
}

// ── Grade colors ────────────────────────────────────────
const GRADE_COLORS: Record<string, string> = {
  "A+": "#979BA0",
  A: "#F88282",
  B: "#FFCE92",
  C: "#C6DB98",
};

// ── Formatters ──────────────────────────────────────────

function formatDate(val: unknown): string {
  if (!val) return "";
  const d = new Date(val as string);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPct(val: unknown): string {
  if (val == null) return "—";
  const n = val as number;
  return n.toFixed(3).replace(/^0/, "");
}

function formatPctSigned(val: unknown): string {
  if (val == null) return "—";
  const n = val as number;
  const s = Math.abs(n).toFixed(3).replace(/^0/, "");
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

function formatNum(val: unknown): string {
  if (val == null) return "—";
  const n = val as number;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function formatNumSigned(val: unknown): string {
  if (val == null) return "—";
  const n = val as number;
  const s = Number.isInteger(n) ? String(Math.abs(n)) : Math.abs(n).toFixed(2);
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

// ── Column definition ───────────────────────────────────

interface Column {
  key: keyof IncrementalWindow;
  label: string;
  sortable: boolean;
  format: (v: unknown) => string;
  bold?: boolean;
}

const columns: Column[] = [
  { key: "gameSpan", label: "Games", sortable: false, format: (v) => String(v ?? "") },
  { key: "startDate", label: "Start", sortable: true, format: formatDate },
  { key: "endDate", label: "End", sortable: true, format: formatDate },
  { key: "lengthDays", label: "Days", sortable: true, format: formatNum },
  { key: "gamesStarted", label: "GS", sortable: true, format: formatNum },
  { key: "gamesPulled", label: "GP", sortable: true, format: formatNum },
  { key: "avgTOI", label: "Avg TOI", sortable: false, format: (v) => String(v ?? "") },
  { key: "record", label: "Record", sortable: false, format: (v) => String(v ?? "") },
  { key: "winPct", label: "Win%", sortable: true, format: formatPct },
  { key: "otCount", label: "OT", sortable: true, format: formatNum },
  { key: "soCount", label: "SO", sortable: true, format: formatNum },
  { key: "totalSOG", label: "SOG", sortable: true, format: formatNum },
  { key: "avgSOG", label: "Avg SOG", sortable: true, format: formatNum },
  { key: "totalSV", label: "SV", sortable: true, format: formatNum },
  { key: "svPct", label: "SV%", sortable: true, format: formatPct },
  { key: "xsvPct", label: "xSV%", sortable: true, format: formatPct },
  { key: "svPctMinusXsvPct", label: "SV%-xSV%", sortable: true, format: formatPctSigned, bold: true },
  { key: "pkSvPct", label: "PK SV%", sortable: true, format: formatPct },
  { key: "highShotGames", label: "Hi Shot", sortable: true, format: formatNum },
  { key: "lowShotGames", label: "Lo Shot", sortable: true, format: formatNum },
  { key: "gamesBelow880", label: "<.880", sortable: true, format: formatNum },
  { key: "gamesAbove920", label: ">.920", sortable: true, format: formatNum },
  { key: "gradeAplusShots", label: "A+ SA", sortable: true, format: formatNum },
  { key: "gradeAShots", label: "A SA", sortable: true, format: formatNum },
  { key: "gradeBShots", label: "B SA", sortable: true, format: formatNum },
  { key: "gradeCShots", label: "C SA", sortable: true, format: formatNum },
  { key: "totalGA", label: "GA", sortable: true, format: formatNum },
  { key: "gaa", label: "GAA", sortable: true, format: formatNum },
  { key: "totalXGA", label: "xGA", sortable: true, format: formatNum },
  { key: "xgaMinusGA", label: "xGA-GA", sortable: true, format: formatNumSigned, bold: true },
];

// ── SVG Line Chart (two series, non-smooth) ─────────────

function SVGDualLineChart({
  data,
  height = 260,
  series1Key,
  series2Key,
  series1Label,
  series2Label,
  series1Color = "#3F88C5",
  series2Color = "#E94F37",
  series2Dashed = true,
  formatY = (v: number) => String(v),
}: {
  data: { name: string; [k: string]: unknown }[];
  height?: number;
  series1Key: string;
  series2Key: string;
  series1Label: string;
  series2Label: string;
  series1Color?: string;
  series2Color?: string;
  series2Dashed?: boolean;
  formatY?: (v: number) => string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(400);

  useEffect(() => {
    if (!hostRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    obs.observe(hostRef.current);
    return () => obs.disconnect();
  }, []);

  if (data.length === 0) return <div style={{ color: "var(--text-3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>No data</div>;

  const legendH = 24;
  const pad = { top: 14 + legendH, right: 20, bottom: 32, left: 50 };
  const chartW = w - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allVals = data.flatMap((d) => {
    const v1 = d[series1Key] as number | null;
    const v2 = d[series2Key] as number | null;
    return [v1, v2].filter((v) => v != null) as number[];
  });
  if (allVals.length === 0) return null;

  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const range = maxY - minY || 1;
  const yMin = minY - range * 0.1;
  const yMax = maxY + range * 0.1;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;
  const scaleY = (v: number) => pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const scaleX = (i: number) => pad.left + i * xStep;

  // Grid lines
  const yTicks = 5;
  const yTickStep = (yMax - yMin) / yTicks;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => yMin + i * yTickStep);

  // Build line paths (straight segments, not smooth)
  const buildPath = (key: string) => {
    const points: string[] = [];
    data.forEach((d, i) => {
      const v = d[key] as number | null;
      if (v == null) return;
      points.push(`${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`);
    });
    return points.length > 1 ? "M" + points.join("L") : "";
  };

  const path1 = buildPath(series1Key);
  const path2 = buildPath(series2Key);

  return (
    <div ref={hostRef} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Legend — top, centered (visual width ≈ 140px) */}
        <g transform={`translate(${w / 2 - 70}, 14)`}>
          <line x1={0} x2={16} y1={0} y2={0} stroke={series1Color} strokeWidth={2} />
          <text x={20} y={4} fontSize={10} fill="var(--text-2)" fontFamily="var(--font-body)">{series1Label}</text>
          <line x1={80} x2={96} y1={0} y2={0} stroke={series2Color} strokeWidth={2} strokeDasharray={series2Dashed ? "6 4" : undefined} />
          <text x={100} y={4} fontSize={10} fill="var(--text-2)" fontFamily="var(--font-body)">{series2Label}</text>
        </g>
        {/* Grid */}
        {gridLines.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} x2={w - pad.right} y1={scaleY(v)} y2={scaleY(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={pad.left - 6} y={scaleY(v) + 3} textAnchor="end" fontSize={10} fill="var(--text-3)" fontFamily="var(--font-body)">
              {formatY(v)}
            </text>
          </g>
        ))}
        {/* X axis labels */}
        {data.map((d, i) => {
          const show = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
          return show ? (
            <text key={i} x={scaleX(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--text-3)" fontFamily="var(--font-body)">
              {d.name}
            </text>
          ) : null;
        })}
        {/* Lines */}
        {path1 && <path d={path1} fill="none" stroke={series1Color} strokeWidth={2} />}
        {path2 && <path d={path2} fill="none" stroke={series2Color} strokeWidth={2} strokeDasharray={series2Dashed ? "6 4" : undefined} />}
        {/* Dots */}
        {data.map((d, i) => {
          const v1 = d[series1Key] as number | null;
          const v2 = d[series2Key] as number | null;
          return (
            <g key={i}>
              {v1 != null && <circle cx={scaleX(i)} cy={scaleY(v1)} r={3} fill={series1Color} />}
              {v2 != null && <circle cx={scaleX(i)} cy={scaleY(v2)} r={3} fill={series2Color} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── SVG Stacked Bar Chart (4 grade segments per bar) ────

const GRADE_KEYS = ["A+", "A", "B", "C"] as const;

function SVGGradeBarChart({
  data,
  height = 280,
}: {
  data: { name: string; "A+": number; A: number; B: number; C: number }[];
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(400);

  useEffect(() => {
    if (!hostRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    obs.observe(hostRef.current);
    return () => obs.disconnect();
  }, []);

  if (data.length === 0) return <div style={{ color: "var(--text-3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>No data</div>;

  const legendH = 24;
  const pad = { top: 14 + legendH, right: 16, bottom: 32, left: 36 };
  const chartW = w - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Stack: A+ bottom → C top
  const stacked = data.map((d) => {
    let running = 0;
    const segments = GRADE_KEYS.map((k) => {
      const base = running;
      running += d[k];
      return { grade: k, base, top: running, val: d[k] };
    });
    return { name: d.name, total: running, segments };
  });

  const maxTotal = Math.max(...stacked.map((d) => d.total), 1);
  const maxY = maxTotal * 1.1; // headroom for total label
  const baseline = pad.top + chartH;
  const scaleH = (v: number) => (v / maxY) * chartH;

  // Bar geometry — one wide bar per window
  const groupW = chartW / data.length;
  const barW = Math.min(groupW * 0.6, 44);

  // Grid
  const yTicks = 5;
  const gridStep = maxTotal / yTicks;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => gridStep * i);
  const scaleY = (v: number) => baseline - scaleH(v);

  // Segment label contrast colors
  const segLabelColor: Record<string, string> = {
    "A+": "#fff",
    A: "#fff",
    B: "#5a3a00",
    C: "#2a4a10",
  };

  return (
    <div ref={hostRef} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Legend — top, centered (visual width ≈ (n-1)*56 + 24) */}
        <g transform={`translate(${w / 2 - ((GRADE_KEYS.length - 1) * 56 + 24) / 2}, 14)`}>
          {GRADE_KEYS.map((grade, i) => (
            <g key={grade} transform={`translate(${i * 56}, 0)`}>
              <rect x={0} y={-5} width={10} height={10} rx={2} fill={GRADE_COLORS[grade]} />
              <text x={14} y={4} fontSize={10} fill="var(--text-2)" fontFamily="var(--font-body)">{grade}</text>
            </g>
          ))}
        </g>
        {/* Grid */}
        {gridLines.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} x2={w - pad.right} y1={scaleY(v)} y2={scaleY(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={pad.left - 4} y={scaleY(v) + 3} textAnchor="end" fontSize={9} fill="var(--text-3)" fontFamily="var(--font-body)">
              {Math.round(v)}
            </text>
          </g>
        ))}
        {/* Stacked bars */}
        {stacked.map((d, gi) => {
          const cx = pad.left + gi * groupW + groupW / 2;
          const x = cx - barW / 2;
          return (
            <g key={d.name}>
              {/* X axis label */}
              <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fill="var(--text-3)" fontFamily="var(--font-body)">
                {d.name}
              </text>
              {/* Segments */}
              {d.segments.map((seg, si) => {
                const segH = scaleH(seg.val);
                const y = baseline - scaleH(seg.top);
                const isFirst = si === 0;
                const isLast = si === d.segments.length - 1;
                return (
                  <g key={seg.grade}>
                    <rect
                      x={x} y={y} width={barW} height={segH}
                      rx={isFirst || isLast ? 3 : 0}
                      fill={GRADE_COLORS[seg.grade]}
                      fillOpacity={0.9}
                    />
                    {/* Value inside segment if tall enough */}
                    {segH >= 16 && (
                      <text x={cx} y={y + segH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill={segLabelColor[seg.grade]} fontFamily="var(--font-body)">
                        {seg.val}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Total above bar */}
              <text x={cx} y={scaleY(d.total) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-1)" fontFamily="var(--font-display)">
                {d.total}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Component ───────────────────────────────────────────

export default function IncrementalClient({
  windows5,
  windows10,
  totalGames,
}: IncrementalClientProps) {
  const [tab, setTab] = useState<5 | 10>(5);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(totalGames);
  const [sortKey, setSortKey] = useState<keyof IncrementalWindow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const activeWindows = tab === 5 ? windows5 : windows10;

  const filteredWindows = useMemo(() => {
    return activeWindows.filter((w) => {
      const parts = w.gameSpan.split("-");
      const wStart = parseInt(parts[0], 10);
      const wEnd = parseInt(parts[1], 10);
      return wStart >= rangeStart && wEnd <= rangeEnd;
    });
  }, [activeWindows, rangeStart, rangeEnd]);

  const sortedWindows = useMemo(() => {
    if (!sortKey) return filteredWindows;
    return [...filteredWindows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredWindows, sortKey, sortDir]);

  const handleSort = useCallback((key: keyof IncrementalWindow) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  // Chart data — capped at last 10 windows so charts stay readable
  const MAX_CHART_WINDOWS = 10;
  const chartWindows = useMemo(() => {
    if (filteredWindows.length <= MAX_CHART_WINDOWS) return filteredWindows;
    return filteredWindows.slice(filteredWindows.length - MAX_CHART_WINDOWS);
  }, [filteredWindows]);

  const gaChartData = useMemo(
    () =>
      chartWindows.map((w) => ({
        name: w.gameSpan,
        GA: w.totalGA,
        "xGA-GA": w.xgaMinusGA,
      })),
    [chartWindows],
  );

  const svPctChartData = useMemo(
    () =>
      chartWindows.map((w) => ({
        name: w.gameSpan,
        "SV%": w.svPct,
        "SV%-xSV%": w.svPctMinusXsvPct,
      })),
    [chartWindows],
  );

  const gradeLineData = useMemo(
    () =>
      chartWindows.map((w) => ({
        name: w.gameSpan,
        "A+": w.gradeAplusShots,
        A: w.gradeAShots,
        B: w.gradeBShots,
        C: w.gradeCShots,
      })),
    [chartWindows],
  );

  return (
    <div className="wrap">
      <div style={{ height: 28 }} />

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--gap)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div className="toggle-group">
          <button
            className={`toggle-btn ${tab === 5 ? "active" : ""}`}
            onClick={() => setTab(5)}
          >
            5-Game Windows
          </button>
          <button
            className={`toggle-btn ${tab === 10 ? "active" : ""}`}
            onClick={() => setTab(10)}
          >
            10-Game Windows
          </button>
        </div>

        {/* Range selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-2)" }}>Games</span>
          <input
            type="number"
            min={1}
            max={totalGames}
            value={rangeStart}
            onChange={(e) =>
              setRangeStart(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="filter-input"
            style={{ width: 64, textAlign: "center", padding: "6px 8px" }}
          />
          <span style={{ color: "var(--text-2)" }}>to</span>
          <input
            type="number"
            min={1}
            max={totalGames}
            value={rangeEnd}
            onChange={(e) =>
              setRangeEnd(
                Math.min(totalGames, parseInt(e.target.value, 10) || totalGames),
              )
            }
            className="filter-input"
            style={{ width: 64, textAlign: "center", padding: "6px 8px" }}
          />
          <button
            onClick={() => {
              setRangeStart(1);
              setRangeEnd(totalGames);
            }}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "6px 14px",
              fontSize: 11,
              color: "var(--text-2)",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
            }}
          >
            Reset
          </button>
          <span style={{ color: "var(--text-3)", marginLeft: 8, fontSize: 11 }}>
            {filteredWindows.length} window
            {filteredWindows.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Charts — 3-column row */}
      {filteredWindows.length > 1 && (
        <div className="chart-row three section-gap">
          <ChartCard title="GA & xGA-GA">
            <SVGDualLineChart
              data={gaChartData}
              series1Key="GA"
              series2Key="xGA-GA"
              series1Label="GA"
              series2Label="xGA-GA"
              formatY={(v) => v.toFixed(1)}
            />
          </ChartCard>

          <ChartCard title="SV% & SV%-xSV%">
            <SVGDualLineChart
              data={svPctChartData}
              series1Key="SV%"
              series2Key="SV%-xSV%"
              series1Label="SV%"
              series2Label="SV%-xSV%"
              formatY={(v) => v.toFixed(3)}
            />
          </ChartCard>

          <ChartCard title="Shot Grade Distribution">
            <SVGGradeBarChart data={gradeLineData} />
          </ChartCard>
        </div>
      )}

      {/* Data table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <h3 className="card-title">Window Breakdown</h3>
        <div className="card-underline" />
        <div className="game-log-wrap">
          <table className="bold-table game-log-table" style={{ minWidth: 1400 }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      cursor: col.sortable ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === "asc" ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedWindows.map((w) => (
                <tr key={w.gameSpan}>
                  {columns.map((col) => {
                    const raw = w[col.key];
                    const formatted = col.format(raw);
                    // Color signed values
                    let className = "";
                    if (
                      col.key === "svPctMinusXsvPct" ||
                      col.key === "xgaMinusGA"
                    ) {
                      const n = raw as number | null;
                      if (n != null && n > 0) className = "delta-good";
                      else if (n != null && n < 0) className = "delta-bad";
                    }
                    return (
                      <td
                        key={col.key}
                        className={className}
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: 12,
                          fontWeight: col.bold ? 600 : undefined,
                        }}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {sortedWindows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      textAlign: "center",
                      color: "var(--text-3)",
                      padding: "24px 0",
                    }}
                  >
                    No windows match the selected range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
