// ============================================================
// Recharts Theme Constants — Bold Rounded Design System
// ============================================================

export const CHART_PRIMARY = "#3F88C5";
export const CHART_ACCENT = "#E94F37";
export const CHART_MUTED = "#A0A4A6";

export const GRADE_COLORS: Record<string, string> = {
  "A+": "#979BA0",
  A: "#F88282",
  B: "#FFCE92",
  C: "#C6DB98",
};

export const PERIOD_COLORS = ["#B8C5D0", "#3F88C5", "#637582"];

export const BAR_RADIUS: [number, number, number, number] = [10, 10, 0, 0];
export const BAR_OPACITY = 0.85;

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#EBEBD6",
    border: "1px solid #E4E4DE",
    borderRadius: 14,
    color: "#393E41",
    fontSize: 12,
    fontFamily: "'Work Sans', sans-serif",
    padding: "8px 12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  itemStyle: {
    color: "#393E41",
    fontSize: 12,
    fontFamily: "'Work Sans', sans-serif",
  },
  labelStyle: {
    color: "#6A6F72",
    fontSize: 10,
    fontFamily: "'Work Sans', sans-serif",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: 4,
  },
};

export const AXIS_TICK_STYLE = {
  fill: "#6A6F72",
  fontSize: 12,
  fontFamily: "'Work Sans', sans-serif",
};

export const AXIS_TICK_SMALL = {
  fill: "#A0A4A6",
  fontSize: 9,
  fontFamily: "'Work Sans', sans-serif",
};

export const GRID_STYLE = {
  stroke: "#E4E4DE",
  strokeDasharray: "none",
};

export const VALUE_LABEL_STYLE = {
  fontFamily: "'Darker Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 11,
  fill: "#393E41",
};

// Chart dimension defaults
export const CHART_HEIGHT = 280;
export const CHART_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };
