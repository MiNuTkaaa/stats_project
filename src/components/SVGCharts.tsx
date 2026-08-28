"use client";

import { useState, useRef, useCallback } from "react";

// ── Tooltip ──────────────────────────────────────────────
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

function ChartTooltip({ state }: { state: TooltipState }) {
  if (!state.visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: state.x,
        top: state.y,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "8px 12px",
        fontSize: "11px",
        fontFamily: "'Work Sans', sans-serif",
        color: "var(--text-1)",
        pointerEvents: "none",
        zIndex: 10,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        transform: "translate(-50%, -100%)",
        marginTop: "-8px",
      }}
    >
      {state.content}
    </div>
  );
}

function TtHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 600,
        fontSize: "11px",
        marginBottom: "4px",
        color: "var(--text-1)",
      }}
    >
      {children}
    </div>
  );
}

function TtRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        fontSize: "11px",
      }}
    >
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontWeight: 600, fontFamily: "'Darker Grotesque', sans-serif" }}>{value}</span>
    </div>
  );
}

// ── Line / Area Chart (SV% vs Expected) ──────────────────
interface LineChartDatum {
  label: string;
  actual: number | null;
  expected: number | null;
  meta?: string;
}

export function SVGLineChart({
  data,
  height = 280,
}: {
  data: LineChartDatum[];
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [crosshairIdx, setCrosshairIdx] = useState<number | null>(null);

  const filtered = data.filter((d) => d.actual !== null);
  if (filtered.length === 0)
    return (
      <div style={{ color: "var(--text-3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>
        No data
      </div>
    );

  const W = 620, H = 260;
  const padL = 46, padR = 14, padT = 14, padB = 30;
  const n = filtered.length;

  const actuals = filtered.map((d) => d.actual!);
  const expectations = filtered.map((d) => d.expected);
  const allVals = actuals.concat(expectations.filter((v): v is number => v !== null));
  const yMin = Math.floor(Math.min(...allVals) * 100) / 100 - 0.02;
  const yMax = Math.ceil(Math.max(...allVals) * 100) / 100 + 0.01;
  const yRange = yMax - yMin || 0.02;

  const x = (i: number) => (n > 1 ? padL + (W - padL - padR) * (i / (n - 1)) : (padL + W - padR) / 2);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - yMin) / yRange);

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + yRange * (i / 4));

  // Area path
  let areaD = `M ${x(0)} ${y(actuals[0])}`;
  for (let i = 1; i < n; i++) areaD += ` L ${x(i)} ${y(actuals[i])}`;
  areaD += ` L ${x(n - 1)} ${y(yMin)} L ${x(0)} ${y(yMin)} Z`;

  // Actual line path
  let actualD = `M ${x(0)} ${y(actuals[0])}`;
  for (let i = 1; i < n; i++) actualD += ` L ${x(i)} ${y(actuals[i])}`;

  // Expected line path (may have gaps)
  let expD = "";
  let started = false;
  for (let i = 0; i < n; i++) {
    if (expectations[i] === null) continue;
    if (!started) { expD = `M ${x(i)} ${y(expectations[i]!)}`; started = true; }
    else expD += ` L ${x(i)} ${y(expectations[i]!)}`;
  }

  const gradId = "lineGrad";

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svg = e.currentTarget.closest("svg");
      if (!svg || !hostRef.current) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      let idx = n > 1 ? Math.round((mx - padL) / ((W - padL - padR) / (n - 1))) : 0;
      idx = Math.max(0, Math.min(n - 1, idx));
      setCrosshairIdx(idx);

      const hostRect = hostRef.current.getBoundingClientRect();
      const pxX = (x(idx) / W) * hostRect.width;
      const pxY = (y(actuals[idx]) / H) * hostRect.height;
      const expTxt = expectations[idx] === null ? "—" : expectations[idx]!.toFixed(3);

      setTooltip({
        visible: true,
        x: pxX,
        y: pxY,
        content: (
          <>
            <TtHead>{filtered[idx].meta || filtered[idx].label}</TtHead>
            <TtRow label="Actual" value={actuals[idx].toFixed(3)} />
            <TtRow label="Expected" value={expTxt} />
          </>
        ),
      });
    },
    [n, actuals, expectations, filtered],
  );

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
              {t.toFixed(3)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {filtered.map((d, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
            {d.label}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradId})`} />

        {/* Expected dashed line */}
        {expD && <path d={expD} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4,3" />}

        {/* Actual line */}
        <path d={actualD} fill="none" stroke="var(--primary)" strokeWidth={2} />

        {/* Expected dots */}
        {expectations.map((v, i) =>
          v !== null ? (
            <circle key={`exp-${i}`} cx={x(i)} cy={y(v)} r={4} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.5} />
          ) : null,
        )}

        {/* Actual dots */}
        {actuals.map((v, i) => (
          <circle key={`act-${i}`} cx={x(i)} cy={y(v)} r={5} fill="var(--primary)" />
        ))}

        {/* Crosshair */}
        {crosshairIdx !== null && (
          <line x1={x(crosshairIdx)} x2={x(crosshairIdx)} y1={padT} y2={H - padB} stroke="var(--text-3)" strokeWidth={1} opacity={0.5} />
        )}

        {/* Hit area */}
        <rect
          x={padL}
          y={padT}
          width={W - padL - padR}
          height={H - padT - padB}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setTooltip((t) => ({ ...t, visible: false })); setCrosshairIdx(null); }}
        />
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  );
}

// ── Vertical Bar Chart ───────────────────────────────────
interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function SVGBarChart({
  data,
  height = 280,
  unitLabel = "Games",
  compact = false,
}: {
  data: BarDatum[];
  height?: number;
  unitLabel?: string;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: null,
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return <div style={{ color: "var(--text-3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>No data</div>;

  const W = compact ? 380 : 560, H = compact ? 300 : 260;
  const padL = compact ? 38 : 34, padR = 14, padT = 20, padB = compact ? 44 : 38;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const maxY = Math.max(...data.map((d) => d.value), 1) + 1;
  const bw = chartW / data.length;
  const barW = bw * 0.5;
  const steps = Math.min(5, maxY);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {/* Grid lines */}
        {Array.from({ length: steps + 1 }, (_, t) => {
          const val = Math.round(maxY * t / steps);
          const yy = padT + chartH * (1 - val / maxY);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--border)" strokeWidth={1} />
              <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars + labels */}
        {data.map((d, i) => {
          const bx = padL + bw * i + (bw - barW) / 2;
          const bh = chartH * (d.value / maxY);
          const by = padT + chartH - bh;
          const fill = d.color || "var(--primary)";
          return (
            <g key={i}>
              <rect
                x={bx} y={by} width={barW} height={bh}
                fill={fill} opacity={hoverIdx === i ? 1 : 0.85} rx={4} ry={4}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  if (!hostRef.current) return;
                  const hostRect = hostRef.current.getBoundingClientRect();
                  const svg = e.currentTarget.closest("svg")!;
                  const svgRect = svg.getBoundingClientRect();
                  const pxX = ((bx + barW / 2) / W) * svgRect.width;
                  const pxY = (by / H) * svgRect.height;
                  setTooltip({
                    visible: true, x: pxX, y: pxY,
                    content: <><TtHead>{d.label}</TtHead><TtRow label={unitLabel} value={d.value} /></>,
                  });
                }}
                onMouseLeave={() => { setHoverIdx(null); setTooltip((t) => ({ ...t, visible: false })); }}
              />
              {d.value > 0 && (
                <text x={bx + barW / 2} y={by - 6} textAnchor="middle" fontSize="13" fill="var(--text-1)" fontFamily="'Darker Grotesque', sans-serif" fontWeight={700}>
                  {d.value}
                </text>
              )}
              <text x={padL + bw * i + bw / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────────
interface HBarDatum {
  label: string;
  value: number;
  color?: string;
}

export function SVGHBarChart({
  data,
  height = 280,
  unitLabel = "Value",
  labelWidth = 54,
}: {
  data: HBarDatum[];
  height?: number;
  unitLabel?: string;
  labelWidth?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: null,
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return <div style={{ color: "var(--text-3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>No data</div>;

  const W = 560, H = 260;
  const padL = labelWidth, padR = 60, padT = 8, padB = 8;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const rowH = (H - padT - padB) / data.length;
  const chartW = W - padL - padR;

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {data.map((d, i) => {
          const yy = padT + rowH * i + rowH * 0.22;
          const bh = rowH * 0.56;
          const bw = chartW * (d.value / maxV);
          const fill = d.color || "var(--primary)";
          return (
            <g key={i}>
              <text x={padL - 8} y={yy + bh / 2 + 3} textAnchor="end" fontSize="10.5" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
                {d.label}
              </text>
              <rect
                x={padL} y={yy} width={Math.max(bw, 0)} height={bh}
                fill={fill} opacity={hoverIdx === i ? 1 : 0.85} rx={4} ry={4}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  if (!hostRef.current) return;
                  const svg = e.currentTarget.closest("svg")!;
                  const svgRect = svg.getBoundingClientRect();
                  const pxX = ((padL + bw / 2) / W) * svgRect.width;
                  const pxY = (yy / H) * svgRect.height;
                  setTooltip({
                    visible: true, x: pxX, y: pxY,
                    content: <><TtHead>{d.label}</TtHead><TtRow label={unitLabel} value={d.value} /></>,
                  });
                }}
                onMouseLeave={() => { setHoverIdx(null); setTooltip((t) => ({ ...t, visible: false })); }}
              />
              <text x={padL + bw + 8} y={yy + bh / 2 + 4} fontSize="12" fill="var(--text-1)" fontFamily="'Darker Grotesque', sans-serif" fontWeight={700}>
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  );
}

// ── Grade Horizontal Bar Chart ───────────────────────────
interface GradeDatum {
  letter: string;
  goals: number;
  shots: number;
  svPct: number | null;
}

export function SVGGradeChart({
  data,
  height = 260,
}: {
  data: GradeDatum[];
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: null,
  });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const gradeBarColor: Record<string, string> = {
    "A+": "#979BA0",
    A: "#F88282",
    B: "#FFCE92",
    C: "#C6DB98",
  };

  const W = 560, H = 260;
  const padL = 40, padT = 8, padB = 8;
  const maxV = Math.max(...data.map((d) => d.goals), 1);
  const rowH = (H - padT - padB) / data.length;
  const chartW = 150;

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {data.map((d, i) => {
          const yy = padT + rowH * i;
          const barY = yy + rowH * 0.22;
          const bh = rowH * 0.56;
          const bw = chartW * (d.goals / maxV);
          const opacity = 1 - i * 0.18;
          return (
            <g key={i}>
              {/* Grade label */}
              <text x={padL - 8} y={barY + bh / 2 + 4} textAnchor="end" fontSize="13" fill="var(--text-1)" fontFamily="'Darker Grotesque', sans-serif" fontWeight={700}>
                {d.letter}
              </text>
              {/* Bar */}
              <rect
                x={padL} y={barY} width={Math.max(bw, 0)} height={bh}
                fill={gradeBarColor[d.letter] ?? "var(--primary)"} opacity={hoverIdx === i ? 1 : 0.9} rx={4} ry={4}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={(e) => {
                  setHoverIdx(i);
                  if (!hostRef.current) return;
                  const svg = e.currentTarget.closest("svg")!;
                  const svgRect = svg.getBoundingClientRect();
                  const pxX = ((padL + bw / 2) / W) * svgRect.width;
                  const pxY = (barY / H) * svgRect.height;
                  setTooltip({
                    visible: true, x: pxX, y: pxY,
                    content: (
                      <>
                        <TtHead>Grade {d.letter}</TtHead>
                        <TtRow label="Goals" value={d.goals} />
                        <TtRow label="Shots" value={d.shots} />
                        <TtRow label="SV%" value={d.svPct != null ? d.svPct.toFixed(3) : "—"} />
                      </>
                    ),
                  });
                }}
                onMouseLeave={() => { setHoverIdx(null); setTooltip((t) => ({ ...t, visible: false })); }}
              />
              {/* Stat text after bar */}
              <text x={padL + chartW + 14} y={barY + bh / 2 + 4} fontSize="11" fill="var(--text-2)" fontFamily="'Work Sans', sans-serif">
                {d.goals} goals / {d.shots} shots · {d.svPct != null ? d.svPct.toFixed(3) : "—"} SV%
              </text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  );
}

// ── Grouped Vertical Bar Chart (Period Distribution) ─────
interface GroupedBarDatum {
  label: string;
  values: { key: string; value: number; color: string }[];
}

export function SVGGroupedBarChart({
  data,
  height = 280,
  legend,
  compact = false,
}: {
  data: GroupedBarDatum[];
  height?: number;
  legend?: { key: string; color: string; label: string }[];
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, content: null,
  });
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  if (data.length === 0) return null;

  const W = compact ? 380 : 560, H = compact ? 300 : 260;
  const padL = 34, padR = 14, padT = 20, padB = 38;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const maxY = Math.max(...data.flatMap((d) => d.values.map((v) => v.value)), 1) + 1;
  const groupW = chartW / data.length;
  const numBars = data[0]?.values.length || 1;
  const barW = (groupW * 0.7) / numBars;
  const groupPad = groupW * 0.15;
  const steps = Math.min(5, maxY);

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      {legend && (
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginBottom: "6px", fontSize: "11px", color: "var(--text-2)", fontFamily: "'Work Sans', sans-serif" }}>
          {legend.map((l) => (
            <span key={l.key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        {/* Grid */}
        {Array.from({ length: steps + 1 }, (_, t) => {
          const val = Math.round(maxY * t / steps);
          const yy = padT + chartH * (1 - val / maxY);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--border)" strokeWidth={1} />
              <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">{val}</text>
            </g>
          );
        })}

        {/* Grouped bars */}
        {data.map((group, gi) => (
          <g key={gi}>
            <text x={padL + groupW * gi + groupW / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="var(--text-3)" fontFamily="'Work Sans', sans-serif">
              {group.label}
            </text>
            {group.values.map((v, bi) => {
              const bx = padL + groupW * gi + groupPad + barW * bi;
              const bh = chartH * (v.value / maxY);
              const by = padT + chartH - bh;
              const key = `${gi}-${bi}`;
              return (
                <rect
                  key={key}
                  x={bx} y={by} width={barW} height={bh}
                  fill={v.color} opacity={hoverKey === key ? 1 : 0.85} rx={4} ry={4}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => {
                    setHoverKey(key);
                    if (!hostRef.current) return;
                    const svg = e.currentTarget.closest("svg")!;
                    const svgRect = svg.getBoundingClientRect();
                    const pxX = ((bx + barW / 2) / W) * svgRect.width;
                    const pxY = (by / H) * svgRect.height;
                    setTooltip({
                      visible: true, x: pxX, y: pxY,
                      content: <><TtHead>{group.label} — {v.key}</TtHead><TtRow label="Count" value={v.value} /></>,
                    });
                  }}
                  onMouseLeave={() => { setHoverKey(null); setTooltip((t) => ({ ...t, visible: false })); }}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  );
}
