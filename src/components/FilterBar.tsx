"use client";

import { useState, useCallback } from "react";

interface FilterBarProps {
  view: "simple" | "detailed";
  onViewChange: (view: "simple" | "detailed") => void;
  seasons: string[];
  onApplyFilters: (filters: {
    seasons: string[];
    dateFrom: string;
    dateTo: string;
  }) => void;
}

export default function FilterBar({
  view,
  onViewChange,
  seasons,
  onApplyFilters,
}: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([
    ...seasons,
  ]);

  const handleApply = useCallback(() => {
    onApplyFilters({
      seasons: selectedSeasons,
      dateFrom,
      dateTo,
    });
  }, [selectedSeasons, dateFrom, dateTo, onApplyFilters]);

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season)
        ? prev.filter((s) => s !== season)
        : [...prev, season]
    );
  };

  return (
    <>
      <div className="nav-controls">
        {/* View toggle */}
        <div className="toggle-group">
          <button
            className={`toggle-btn ${view === "simple" ? "active" : ""}`}
            onClick={() => onViewChange("simple")}
          >
            Simple
          </button>
          <button
            className={`toggle-btn ${view === "detailed" ? "active" : ""}`}
            onClick={() => onViewChange("detailed")}
          >
            Detailed
          </button>
        </div>

        {/* Filter toggle */}
        <div className="toggle-group">
          <button
            className={`toggle-btn ${!filterOpen ? "active" : ""}`}
            onClick={() => {
              setFilterOpen(false);
              onApplyFilters({ seasons: [], dateFrom: "", dateTo: "" });
            }}
          >
            Total
          </button>
          <button
            className={`toggle-btn ${filterOpen ? "active" : ""}`}
            onClick={() => {
              setFilterOpen(true);
              onApplyFilters({
                seasons: selectedSeasons,
                dateFrom,
                dateTo,
              });
            }}
          >
            Filters
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className={`filter-panel ${filterOpen ? "open" : ""}`}>
        <div className="filter-inner">
          {/* Date range */}
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

          {/* Season checkboxes */}
          <div>
            <div className="filter-label">Season</div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {seasons.map((season) => (
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

          {/* Apply */}
          <div style={{ alignSelf: "flex-end" }}>
            <button className="apply-btn" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
