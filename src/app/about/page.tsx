export default function AboutPage() {
  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      {/* What Is This? */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="card-title">What Is This?</h2>
        <div className="card-underline"></div>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-2)",
          }}
        >
          This is a personal statistics dashboard for Mikhail Yegorov, tracking detailed
          goaltending performance metrics across every game. All data is entered
          manually and computed in real time to provide a comprehensive picture of
          game-by-game and aggregate performance.
        </p>
      </div>

      {/* How to Navigate */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="card-title">How to Navigate</h2>
        <div className="card-underline"></div>
        <ul
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-2)",
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <li>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              Overview
            </span>{" "}
            &mdash; High-level overview with season filters, key stat cards, and
            trend charts.
          </li>
          <li>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              Game Log
            </span>{" "}
            &mdash; Complete game-by-game data table with every tracked metric.
            Click any row to expand period-by-period breakdowns.
          </li>
          <li>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              Period Breakdown
            </span>{" "}
            &mdash; Per-period aggregate analysis showing performance in each
            period and overtime, with comparison tables.
          </li>
          <li>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              Incremental Stats
            </span>{" "}
            &mdash; Rolling performance windows (5-game and 10-game) to spot
            trends and streaks over time.
          </li>
          <li>
            <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
              About
            </span>{" "}
            &mdash; This page. Glossary of all hockey stat terms used throughout
            the dashboard.
          </li>
        </ul>
      </div>

      {/* Glossary */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="card-title">Glossary</h2>
        <div className="card-underline"></div>
        <div
          style={{
            display: "grid",
            gap: 10,
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {glossary.map(({ term, definition }) => (
            <div
              key={term}
              className="glossary-row"
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--text-1)",
                  fontSize: 13,
                }}
              >
                {term}
              </span>
              <span style={{ color: "var(--text-2)" }}>{definition}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const glossary = [
  { term: "W / L / T", definition: "Win / Loss / Tie" },
  { term: "H / A", definition: "Home / Away" },
  {
    term: "TOI",
    definition:
      "Time on Ice — total minutes played in a game or period",
  },
  {
    term: "B2B",
    definition: "Back-to-Back — game played on consecutive days",
  },
  {
    term: "OT",
    definition: "Overtime — game that went beyond regulation",
  },
  {
    term: "SO",
    definition: "Shootout — game decided by a shootout",
  },
  {
    term: "GA",
    definition: "Goals Against — total goals allowed",
  },
  {
    term: "xGA",
    definition:
      "Expected Goals Against — statistically expected goals based on shot quality",
  },
  {
    term: "xGA - GA",
    definition:
      "Goals Saved Above Expected — positive means fewer goals allowed than expected",
  },
  {
    term: "SA / SOG",
    definition:
      "Shots on Goal — shots that required a save or resulted in a goal",
  },
  {
    term: "TSA",
    definition:
      "Total Shot Attempts — all shots including blocked and missed",
  },
  {
    term: "SB",
    definition:
      "Shots Blocked — shots blocked before reaching the goaltender",
  },
  {
    term: "SM",
    definition: "Shots Missed — shots that missed the net entirely",
  },
  {
    term: "SV",
    definition:
      "Saves — shots on goal stopped by the goaltender",
  },
  {
    term: "SV%",
    definition:
      "Save Percentage — saves divided by shots on goal (e.g. .920)",
  },
  {
    term: "xSV%",
    definition:
      "Expected Save Percentage — statistically expected save percentage based on shot quality",
  },
  {
    term: "SV% - xSV%",
    definition:
      "Save Percentage Above Expected — positive means outperforming expected save rate",
  },
  {
    term: "GAA",
    definition:
      "Goals Against Average — average goals allowed per 60 minutes of play",
  },
  {
    term: "PK",
    definition: "Penalty Kill — shorthanded situations",
  },
  {
    term: "PP",
    definition: "Power Play — shorthanded goals for the opposite team",
  },
  {
    term: "PIM",
    definition:
      "Penalties In Minutes — total penalty minutes assessed",
  },
  {
    term: "Grade A+",
    definition:
      "Highest danger shots/goals",
  },
  {
    term: "Grade A",
    definition: "High danger shots/goals",
  },
  {
    term: "Grade B",
    definition:
      "Medium danger shots/goals",
  },
  {
    term: "Grade C",
    definition:
      "Low danger shots/goals",
  },
  {
    term: "Rebound (G/R/B)",
    definition:
      "Rebound control quality — Green (controlled), Red (dangerous rebound), Black (no rebound or freeze)",
  },
  {
    term: "Control Rate",
    definition:
      "Percentage of rebounds that were controlled (green + black)",
  },
  {
    term: "Glove (G/R/B)",
    definition:
      "Glove-side save quality — Green (clean catch), Red (goal + bad rebound, will be fixed later), Black (freeze)",
  },
  {
    term: "Glove Save Rate",
    definition:
      "Percentage of glove saves that were clean (green + black)",
  },
  {
    term: "Glove Freeze Rate",
    definition:
      "Percentage of glove saves resulting in a whistle (black)",
  },
  {
    term: "Playmaking (G/R/B)",
    definition:
      "Puck distribution after saves — Green (good pass), Red (pass to another team), Black (freeze)",
  },
  {
    term: "Retention Rate",
    definition:
      "Percentage of puck distributions that were successful outlets",
  },
  {
    term: "Pipes",
    definition: "Posts/crossbar hit by opponent shots",
  },
];
