"use client";

import React, { useState, useTransition } from "react";
import { X } from "lucide-react";
import { createGame, updateGame } from "@/app/admin/actions";
import type { Game, GamePeriod } from "@/lib/types/database";

// ============================================================
// Types & helpers
// ============================================================

type PeriodData = {
  period: string;
  toi: string;
  score: string;
  started: boolean;
  pulled: boolean;
  ga: number;
  grade_aplus_goals: number;
  grade_a_goals: number;
  grade_b_goals: number;
  grade_c_goals: number;
  pk_ga: number;
  pp_ga: number;
  tsa: number;
  sb: number;
  sm: number;
  sog: number;
  pim_total: string;
  pk_count: number;
  pk_tsa: number;
  pk_sog: number;
};

const ALL_PERIODS = ["Period 1", "Period 2", "Period 3", "OT", "SO"] as const;

function normalizePeriodName(name: string): string {
  return ({ P1: "Period 1", P2: "Period 2", P3: "Period 3" }[name] ?? name);
}

const emptyPeriod = (name: string): PeriodData => ({
  period: name,
  toi: name === "OT" ? "5:00" : name === "SO" ? "0:00" : "20:00",
  score: "",
  started: true,
  pulled: false,
  ga: 0,
  grade_aplus_goals: 0,
  grade_a_goals: 0,
  grade_b_goals: 0,
  grade_c_goals: 0,
  pk_ga: 0,
  pp_ga: 0,
  tsa: 0,
  sb: 0,
  sm: 0,
  sog: 0,
  pim_total: "",
  pk_count: 0,
  pk_tsa: 0,
  pk_sog: 0,
});

type GameEntryModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editGame?: Game & { game_periods?: GamePeriod[] };
};

// ============================================================
// Row configuration for the spreadsheet table
// ============================================================

type RowType = "number" | "text" | "checkbox" | "decimal";

type FieldRow = {
  label: string;
  gameKey: string;
  periodKey?: string; // undefined = Total only
  type: RowType;
  section: string;
  placeholder?: string;
  step?: string;
};

const ROW_CONFIG: FieldRow[] = [
  // Situation
  { label: "TOI", gameKey: "toi", periodKey: "toi", type: "text", section: "Situation", placeholder: "20:00" },
  { label: "Score", gameKey: "score", periodKey: "score", type: "text", section: "Situation", placeholder: "3-2" },
  { label: "Started", gameKey: "started", periodKey: "started", type: "checkbox", section: "Situation" },
  { label: "Pulled", gameKey: "pulled", periodKey: "pulled", type: "checkbox", section: "Situation" },
  // Goals
  { label: "GA", gameKey: "ga", periodKey: "ga", type: "number", section: "Goals" },
  { label: "A+ Goals", gameKey: "gradeAplusGoals", periodKey: "grade_aplus_goals", type: "number", section: "Goals" },
  { label: "A Goals", gameKey: "gradeAGoals", periodKey: "grade_a_goals", type: "number", section: "Goals" },
  { label: "B Goals", gameKey: "gradeBGoals", periodKey: "grade_b_goals", type: "number", section: "Goals" },
  { label: "C Goals", gameKey: "gradeCGoals", periodKey: "grade_c_goals", type: "number", section: "Goals" },
  { label: "PK GA", gameKey: "pkGa", periodKey: "pk_ga", type: "number", section: "Goals" },
  { label: "PP GA", gameKey: "ppGa", periodKey: "pp_ga", type: "number", section: "Goals" },
  { label: "xGA", gameKey: "xga", type: "decimal", section: "Goals", placeholder: "0.00", step: "0.01" },
  { label: "GA 1st 5 Shots", gameKey: "gaFirst5Shots", type: "number", section: "Goals" },
  { label: "GA 1st 5 Mins", gameKey: "gaFirst5Mins", type: "number", section: "Goals" },
  { label: "GA Last 5 Min", gameKey: "gaLast5Mins", type: "number", section: "Goals" },
  // Shots
  { label: "TSA", gameKey: "tsa", periodKey: "tsa", type: "number", section: "Shots" },
  { label: "SB", gameKey: "sb", periodKey: "sb", type: "number", section: "Shots" },
  { label: "SM", gameKey: "sm", periodKey: "sm", type: "number", section: "Shots" },
  { label: "SOG", gameKey: "sog", periodKey: "sog", type: "number", section: "Shots" },
  { label: "xSV%", gameKey: "xsvPct", type: "decimal", section: "Shots", placeholder: "0.920", step: "0.001" },
  { label: "Pipes", gameKey: "pipes", type: "number", section: "Shots" },
  { label: "A+ Shots", gameKey: "gradeAplusShots", type: "number", section: "Shots" },
  { label: "A Shots", gameKey: "gradeAShots", type: "number", section: "Shots" },
  { label: "B Shots", gameKey: "gradeBShots", type: "number", section: "Shots" },
  { label: "C Shots", gameKey: "gradeCShots", type: "number", section: "Shots" },
  // Penalty Kill
  { label: "PIM Total", gameKey: "pimTotal", periodKey: "pim_total", type: "text", section: "Penalty Kill", placeholder: "0:00" },
  { label: "PK Count", gameKey: "pkCount", periodKey: "pk_count", type: "number", section: "Penalty Kill" },
  { label: "PK TSA", gameKey: "pkTsa", periodKey: "pk_tsa", type: "number", section: "Penalty Kill" },
  { label: "PK SOG", gameKey: "pkSog", periodKey: "pk_sog", type: "number", section: "Penalty Kill" },
  { label: "PK Time", gameKey: "pkTime", type: "text", section: "Penalty Kill", placeholder: "10:00" },
  // Rebound / Glove / Playmaking
  { label: "Reb. Green", gameKey: "reboundGreen", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "Reb. Red", gameKey: "reboundRed", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "Reb. Black", gameKey: "reboundBlack", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "Glove Green", gameKey: "gloveGreen", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "Glove Red", gameKey: "gloveRed", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "Glove Black", gameKey: "gloveBlack", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "PM Green", gameKey: "playmakingGreen", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "PM Red", gameKey: "playmakingRed", type: "number", section: "Rebound / Glove / Playmaking" },
  { label: "PM Black", gameKey: "playmakingBlack", type: "number", section: "Rebound / Glove / Playmaking" },
];

// ============================================================
// Checkbox helper
// ============================================================

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span style={{ fontSize: 13, color: "var(--text-1)" }}>{label}</span>
    </label>
  );
}

// ============================================================
// Main Modal
// ============================================================

export default function GameEntryModal({
  open,
  onClose,
  onSuccess,
  editGame,
}: GameEntryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Game info
  const [date, setDate] = useState(editGame?.date ?? "");
  const [opponent, setOpponent] = useState(editGame?.opponent ?? "");
  const [score, setScore] = useState(editGame?.score ?? "");
  const [homeAway, setHomeAway] = useState<"H" | "A">(editGame?.home_away ?? "H");
  const [toi, setToi] = useState(editGame?.toi ?? "60:00");
  const [started, setStarted] = useState(editGame?.started ?? true);
  const [pulled, setPulled] = useState(editGame?.pulled ?? false);
  const [playoff, setPlayoff] = useState(editGame?.playoff ?? false);

  // Goals
  const [xga, setXga] = useState(editGame?.xga?.toString() ?? "");
  const [ga, setGa] = useState(editGame?.ga ?? 0);
  const [gaFirst5Shots, setGaFirst5Shots] = useState(editGame?.ga_first_5_shots ?? 0);
  const [gaFirst5Mins, setGaFirst5Mins] = useState(editGame?.ga_first_5_mins ?? 0);
  const [gaLast5Mins, setGaLast5Mins] = useState(editGame?.ga_last_5_mins ?? 0);
  const [gradeAplusGoals, setGradeAplusGoals] = useState(editGame?.grade_aplus_goals ?? 0);
  const [gradeAGoals, setGradeAGoals] = useState(editGame?.grade_a_goals ?? 0);
  const [gradeBGoals, setGradeBGoals] = useState(editGame?.grade_b_goals ?? 0);
  const [gradeCGoals, setGradeCGoals] = useState(editGame?.grade_c_goals ?? 0);
  const [pkGa, setPkGa] = useState(editGame?.pk_ga ?? 0);
  const [ppGa, setPpGa] = useState(editGame?.pp_ga ?? 0);

  // Shots
  const [tsa, setTsa] = useState(editGame?.tsa ?? 0);
  const [sb, setSb] = useState(editGame?.sb ?? 0);
  const [sm, setSm] = useState(editGame?.sm ?? 0);
  const [sog, setSog] = useState(editGame?.sog ?? 0);
  const [xsvPct, setXsvPct] = useState(editGame?.xsv_pct?.toString() ?? "");
  const [gradeAplusShots, setGradeAplusShots] = useState(editGame?.grade_aplus_shots ?? 0);
  const [gradeAShots, setGradeAShots] = useState(editGame?.grade_a_shots ?? 0);
  const [gradeBShots, setGradeBShots] = useState(editGame?.grade_b_shots ?? 0);
  const [gradeCShots, setGradeCShots] = useState(editGame?.grade_c_shots ?? 0);
  const [pipes, setPipes] = useState(editGame?.pipes ?? 0);

  // Penalty Kill
  const [pimTotal, setPimTotal] = useState(editGame?.pim_total ?? "");
  const [pkCount, setPkCount] = useState(editGame?.pk_count ?? 0);
  const [pkTsa, setPkTsa] = useState(editGame?.pk_tsa ?? 0);
  const [pkSog, setPkSog] = useState(editGame?.pk_sog ?? 0);
  const [pkTime, setPkTime] = useState(editGame?.pk_time ?? "");

  // Advanced
  const [reboundGreen, setReboundGreen] = useState(editGame?.rebound_green ?? 0);
  const [reboundRed, setReboundRed] = useState(editGame?.rebound_red ?? 0);
  const [reboundBlack, setReboundBlack] = useState(editGame?.rebound_black ?? 0);
  const [gloveGreen, setGloveGreen] = useState(editGame?.glove_green ?? 0);
  const [gloveRed, setGloveRed] = useState(editGame?.glove_red ?? 0);
  const [gloveBlack, setGloveBlack] = useState(editGame?.glove_black ?? 0);
  const [playmakingGreen, setPlaymakingGreen] = useState(editGame?.playmaking_green ?? 0);
  const [playmakingRed, setPlaymakingRed] = useState(editGame?.playmaking_red ?? 0);
  const [playmakingBlack, setPlaymakingBlack] = useState(editGame?.playmaking_black ?? 0);

  // Periods
  const [periods, setPeriods] = useState<PeriodData[]>(() => {
    if (editGame?.game_periods) {
      return editGame.game_periods.map((p) => ({
        period: normalizePeriodName(p.period),
        toi: p.toi ?? "20:00",
        score: p.score ?? "",
        started: p.started,
        pulled: p.pulled,
        ga: p.ga,
        grade_aplus_goals: p.grade_aplus_goals,
        grade_a_goals: p.grade_a_goals,
        grade_b_goals: p.grade_b_goals,
        grade_c_goals: p.grade_c_goals,
        pk_ga: p.pk_ga,
        pp_ga: p.pp_ga,
        tsa: p.tsa,
        sb: p.sb,
        sm: p.sm,
        sog: p.sog,
        pim_total: p.pim_total ?? "",
        pk_count: p.pk_count,
        pk_tsa: p.pk_tsa,
        pk_sog: p.pk_sog,
      }));
    }
    // Default: Period 1, 2, 3 for new games
    return [emptyPeriod("Period 1"), emptyPeriod("Period 2"), emptyPeriod("Period 3")];
  });

  // ── Game fields lookup for table-driven rendering ──

  const gameFields: Record<string, { get: string | number | boolean; set: (v: string) => void }> = {
    toi: { get: toi, set: setToi },
    score: { get: score, set: setScore },
    started: { get: started, set: (v) => setStarted(v === "true") },
    pulled: { get: pulled, set: (v) => setPulled(v === "true") },
    ga: { get: ga, set: (v) => setGa(parseInt(v) || 0) },
    gradeAplusGoals: { get: gradeAplusGoals, set: (v) => setGradeAplusGoals(parseInt(v) || 0) },
    gradeAGoals: { get: gradeAGoals, set: (v) => setGradeAGoals(parseInt(v) || 0) },
    gradeBGoals: { get: gradeBGoals, set: (v) => setGradeBGoals(parseInt(v) || 0) },
    gradeCGoals: { get: gradeCGoals, set: (v) => setGradeCGoals(parseInt(v) || 0) },
    pkGa: { get: pkGa, set: (v) => setPkGa(parseInt(v) || 0) },
    ppGa: { get: ppGa, set: (v) => setPpGa(parseInt(v) || 0) },
    xga: { get: xga, set: setXga },
    gaFirst5Shots: { get: gaFirst5Shots, set: (v) => setGaFirst5Shots(parseInt(v) || 0) },
    gaFirst5Mins: { get: gaFirst5Mins, set: (v) => setGaFirst5Mins(parseInt(v) || 0) },
    gaLast5Mins: { get: gaLast5Mins, set: (v) => setGaLast5Mins(parseInt(v) || 0) },
    tsa: { get: tsa, set: (v) => setTsa(parseInt(v) || 0) },
    sb: { get: sb, set: (v) => setSb(parseInt(v) || 0) },
    sm: { get: sm, set: (v) => setSm(parseInt(v) || 0) },
    sog: { get: sog, set: (v) => setSog(parseInt(v) || 0) },
    xsvPct: { get: xsvPct, set: setXsvPct },
    pipes: { get: pipes, set: (v) => setPipes(parseInt(v) || 0) },
    gradeAplusShots: { get: gradeAplusShots, set: (v) => setGradeAplusShots(parseInt(v) || 0) },
    gradeAShots: { get: gradeAShots, set: (v) => setGradeAShots(parseInt(v) || 0) },
    gradeBShots: { get: gradeBShots, set: (v) => setGradeBShots(parseInt(v) || 0) },
    gradeCShots: { get: gradeCShots, set: (v) => setGradeCShots(parseInt(v) || 0) },
    pimTotal: { get: pimTotal, set: setPimTotal },
    pkCount: { get: pkCount, set: (v) => setPkCount(parseInt(v) || 0) },
    pkTsa: { get: pkTsa, set: (v) => setPkTsa(parseInt(v) || 0) },
    pkSog: { get: pkSog, set: (v) => setPkSog(parseInt(v) || 0) },
    pkTime: { get: pkTime, set: setPkTime },
    reboundGreen: { get: reboundGreen, set: (v) => setReboundGreen(parseInt(v) || 0) },
    reboundRed: { get: reboundRed, set: (v) => setReboundRed(parseInt(v) || 0) },
    reboundBlack: { get: reboundBlack, set: (v) => setReboundBlack(parseInt(v) || 0) },
    gloveGreen: { get: gloveGreen, set: (v) => setGloveGreen(parseInt(v) || 0) },
    gloveRed: { get: gloveRed, set: (v) => setGloveRed(parseInt(v) || 0) },
    gloveBlack: { get: gloveBlack, set: (v) => setGloveBlack(parseInt(v) || 0) },
    playmakingGreen: { get: playmakingGreen, set: (v) => setPlaymakingGreen(parseInt(v) || 0) },
    playmakingRed: { get: playmakingRed, set: (v) => setPlaymakingRed(parseInt(v) || 0) },
    playmakingBlack: { get: playmakingBlack, set: (v) => setPlaymakingBlack(parseInt(v) || 0) },
  };

  // ── Period helpers ──

  function togglePeriod(name: string) {
    setPeriods((prev) => {
      const exists = prev.find((p) => p.period === name);
      if (exists) {
        return prev.filter((p) => p.period !== name);
      }
      // Add and sort by canonical order
      const next = [...prev, emptyPeriod(name)];
      next.sort((a, b) => ALL_PERIODS.indexOf(a.period as typeof ALL_PERIODS[number]) - ALL_PERIODS.indexOf(b.period as typeof ALL_PERIODS[number]));
      return next;
    });
  }

  function updatePeriodField(periodIdx: number, key: string, value: string | number | boolean) {
    setPeriods((prev) =>
      prev.map((p, i) => (i === periodIdx ? { ...p, [key]: value } : p)),
    );
  }

  // ── Submit ──

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const gameData = {
      date,
      opponent,
      score,
      home_away: homeAway,
      toi,
      started,
      pulled,
      playoff,
      xga: xga ? parseFloat(xga) : null,
      ga,
      ga_first_5_shots: gaFirst5Shots,
      ga_first_5_mins: gaFirst5Mins,
      ga_last_5_mins: gaLast5Mins,
      grade_aplus_goals: gradeAplusGoals,
      grade_a_goals: gradeAGoals,
      grade_b_goals: gradeBGoals,
      grade_c_goals: gradeCGoals,
      pk_ga: pkGa,
      pp_ga: ppGa,
      tsa,
      sb,
      sm,
      sog,
      xsv_pct: xsvPct ? parseFloat(xsvPct) : null,
      grade_aplus_shots: gradeAplusShots,
      grade_a_shots: gradeAShots,
      grade_b_shots: gradeBShots,
      grade_c_shots: gradeCShots,
      pipes,
      pim_total: pimTotal || null,
      pk_count: pkCount,
      pk_tsa: pkTsa,
      pk_sog: pkSog,
      pk_time: pkTime || null,
      rebound_green: reboundGreen,
      rebound_red: reboundRed,
      rebound_black: reboundBlack,
      glove_green: gloveGreen,
      glove_red: gloveRed,
      glove_black: gloveBlack,
      playmaking_green: playmakingGreen,
      playmaking_red: playmakingRed,
      playmaking_black: playmakingBlack,
    };

    const periodData = periods.map((p) => ({
      period: p.period,
      toi: p.toi || null,
      score: p.score || null,
      started: p.started,
      pulled: p.pulled,
      ga: p.ga,
      grade_aplus_goals: p.grade_aplus_goals,
      grade_a_goals: p.grade_a_goals,
      grade_b_goals: p.grade_b_goals,
      grade_c_goals: p.grade_c_goals,
      pk_ga: p.pk_ga,
      pp_ga: p.pp_ga,
      tsa: p.tsa,
      sb: p.sb,
      sm: p.sm,
      sog: p.sog,
      pim_total: p.pim_total || null,
      pk_count: p.pk_count,
      pk_tsa: p.pk_tsa,
      pk_sog: p.pk_sog,
    }));

    startTransition(async () => {
      try {
        if (editGame) {
          await updateGame(editGame.id, gameData, periodData);
        } else {
          await createGame(gameData, periodData);
        }
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save game");
      }
    });
  }

  if (!open) return null;

  // ── Render helpers ──

  const activePeriods = periods;
  const colCount = 2 + activePeriods.length; // label + Total + periods

  function selectOnZeroFocus(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v === "0" || v === "0.00" || v === "0.000") {
      e.target.select();
    }
  }

  function renderCell(
    row: FieldRow,
    value: string | number | boolean,
    onChange: (v: string | number | boolean) => void,
    disabled?: boolean,
  ) {
    if (disabled) {
      return (
        <td
          key="disabled"
          style={{
            background: "var(--surface-2)",
            minWidth: 70,
          }}
        />
      );
    }

    if (row.type === "checkbox") {
      return (
        <td style={{ minWidth: 70 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
          </div>
        </td>
      );
    }

    const inputType = row.type === "decimal" ? "number" : row.type;

    return (
      <td style={{ minWidth: 70, padding: "3px 2px" }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => {
            if (row.type === "number") {
              onChange(parseInt(e.target.value) || 0);
            } else if (row.type === "decimal") {
              onChange(e.target.value);
            } else {
              onChange(e.target.value);
            }
          }}
          onFocus={selectOnZeroFocus}
          placeholder={row.placeholder}
          step={row.step}
          className="admin-input-compact"
        />
      </td>
    );
  }

  // Short labels for column headers
  const shortPeriodLabel = (name: string) =>
    ({ "Period 1": "P1", "Period 2": "P2", "Period 3": "P3" }[name] ?? name);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
      {/* Overlay */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card" style={{ position: "relative", width: "100%", maxWidth: 1100, padding: 0, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="card-title" style={{ fontSize: 18 }}>
              {editGame ? "Edit Game" : "New Game Entry"}
            </div>
            <div className="card-underline" />
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", padding: 6, borderRadius: 10, color: "var(--text-3)", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 26, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", flex: 1 }}>

          {/* Zone 1: Game Info */}
          <section>
            <h3 className="og-section" style={{ padding: "0 0 6px", marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
              Game Info
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="admin-input"
                  style={{ padding: "8px 12px", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>
                  Opponent
                </label>
                <input
                  type="text"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="Team name"
                  className="admin-input"
                  style={{ padding: "8px 12px", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>
                  Home/Away
                </label>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setHomeAway("H")}
                    style={{
                      flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                      fontFamily: "var(--font-body)", transition: "background 0.15s, color 0.15s",
                      background: homeAway === "H" ? "var(--accent)" : "var(--bg)",
                      color: homeAway === "H" ? "white" : "var(--text-2)",
                    }}
                  >
                    H
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeAway("A")}
                    style={{
                      flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, border: "none", borderLeft: "1px solid var(--border)", cursor: "pointer",
                      fontFamily: "var(--font-body)", transition: "background 0.15s, color 0.15s",
                      background: homeAway === "A" ? "var(--accent)" : "var(--bg)",
                      color: homeAway === "A" ? "white" : "var(--text-2)",
                    }}
                  >
                    A
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <CheckboxField label="Playoff" checked={playoff} onChange={setPlayoff} />
              </div>
            </div>
          </section>

          {/* Zone 2: Period toggles */}
          <section>
            <h3 className="og-section" style={{ padding: "0 0 6px", marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
              Stats
            </h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px", alignSelf: "center", marginRight: 4 }}>
                Periods:
              </span>
              {ALL_PERIODS.map((name) => {
                const isActive = periods.some((p) => p.period === name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => togglePeriod(name)}
                    style={{
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: isActive ? "var(--accent-dim)" : "var(--bg)",
                      color: isActive ? "var(--accent)" : "var(--text-3)",
                      borderColor: isActive ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    {shortPeriodLabel(name)}
                    {isActive && " ✓"}
                  </button>
                );
              })}
            </div>

            {/* Spreadsheet table */}
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th style={{
                      textAlign: "left", padding: "8px 10px", fontSize: 9.5, textTransform: "uppercase",
                      letterSpacing: "1px", color: "var(--text-3)", fontWeight: 500,
                      position: "sticky", left: 0, background: "var(--surface-2)", zIndex: 1,
                      minWidth: 110, borderRight: "1px solid var(--border)",
                    }}>
                      Field
                    </th>
                    <th style={{
                      textAlign: "center", padding: "8px 4px", fontSize: 10, textTransform: "uppercase",
                      letterSpacing: "0.5px", color: "var(--text-1)", fontWeight: 700,
                      minWidth: 76, borderRight: "1px solid var(--border)",
                    }}>
                      Total
                    </th>
                    {activePeriods.map((p) => (
                      <th key={p.period} style={{
                        textAlign: "center", padding: "8px 4px", fontSize: 10, textTransform: "uppercase",
                        letterSpacing: "0.5px", color: "var(--text-2)", fontWeight: 600,
                        minWidth: 76,
                      }}>
                        {shortPeriodLabel(p.period)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let lastSection = "";
                    const rows: React.ReactNode[] = [];

                    ROW_CONFIG.forEach((row, rowIdx) => {
                      // Section header
                      if (row.section !== lastSection) {
                        lastSection = row.section;
                        rows.push(
                          <tr key={`section-${row.section}`}>
                            <td
                              colSpan={colCount}
                              style={{
                                padding: "10px 10px 6px",
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "1.5px",
                                color: "var(--accent)",
                                background: "var(--bg)",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              {row.section}
                            </td>
                          </tr>,
                        );
                      }

                      const field = gameFields[row.gameKey];
                      if (!field) return;

                      rows.push(
                        <tr key={row.gameKey} style={{ borderBottom: "1px solid var(--border)" }}>
                          {/* Label */}
                          <td style={{
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--text-2)",
                            position: "sticky",
                            left: 0,
                            background: "var(--surface)",
                            zIndex: 1,
                            borderRight: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}>
                            {row.label}
                          </td>
                          {/* Total cell */}
                          {renderCell(row, field.get, (v) => {
                            if (row.type === "checkbox") {
                              field.set(String(v));
                            } else {
                              field.set(String(v));
                            }
                          })}
                          {/* Period cells */}
                          {activePeriods.map((p, pIdx) => {
                            if (!row.periodKey) {
                              // Total-only field
                              return (
                                <td
                                  key={p.period}
                                  style={{
                                    background: "var(--surface-2)",
                                    minWidth: 70,
                                  }}
                                />
                              );
                            }
                            const val = p[row.periodKey as keyof PeriodData];
                            return (
                              <React.Fragment key={p.period}>
                                {renderCell(row, val, (v) => {
                                  updatePeriodField(
                                    periods.indexOf(p),
                                    row.periodKey!,
                                    row.type === "number" ? (typeof v === "number" ? v : parseInt(String(v)) || 0) : v,
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </tr>,
                      );
                    });

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status messages */}
          {error && (
            <div style={{
              fontSize: 13, color: "var(--bad)",
              background: "rgba(198, 40, 40, 0.06)", border: "1px solid rgba(198, 40, 40, 0.2)",
              borderRadius: 12, padding: "10px 16px",
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              fontSize: 13, color: "var(--good)",
              background: "rgba(30, 122, 69, 0.06)", border: "1px solid rgba(30, 122, 69, 0.2)",
              borderRadius: 12, padding: "10px 16px",
            }}>
              Game saved successfully!
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="admin-btn secondary"
              style={{ padding: "10px 20px", fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="admin-btn"
              style={{ padding: "10px 28px", fontSize: 14, opacity: isPending ? 0.5 : 1, cursor: isPending ? "not-allowed" : "pointer" }}
            >
              {isPending ? "Saving..." : editGame ? "Update Game" : "Save Game"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
