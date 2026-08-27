# V4 — Crease Report (Next.js + Bold Rounded)

## What This Is

Production-quality goaltender stats dashboard for #35 (Yegorov) — **The Crease Report**. Combines the Supabase-backed data layer from the original website (`C:\Stats website\goalie-stats`) with the Bold Rounded visual design system developed in V3's HTML artifact.

Open `npm run dev` → `localhost:3000`. Requires Supabase env vars in `.env.local`.

## Commands

```bash
npm run dev      # Start dev server (Next.js 16 + Turbopack) on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Tech Stack

- **Next.js 16.3.1** — App Router, Turbopack dev server
- **React 19.2.8** — Client components with `useMemo` for stat computation
- **TypeScript** — Strict mode, `@/*` path alias → `./src/*`
- **Tailwind CSS v4** — via `@tailwindcss/postcss`, design tokens mapped via `@theme inline`
- **Recharts 3.10.1** — Charts restyled with Bold Rounded theme (blue bars, rounded corners, warm tooltips)
- **Supabase** — `@supabase/ssr` 0.12.4 + `@supabase/supabase-js` 2.112.3
- **Fonts** — Darker Grotesque (display/numbers, 400–900) + Work Sans (body, 300–600) via `next/font/google`
- **lucide-react** — Icons (Menu, X, ChevronRight, ChevronDown, ChevronUp)

## Architecture

### Data Flow

1. **Supabase** stores games + periods in two tables (`games`, `game_periods`) with computed views (`games_computed`, `game_periods_computed`) that add derived fields (sv, sv_pct, rebound_control_rate, etc.)

2. **`src/lib/queries.ts`** — Server-side data fetching via Supabase server client. Functions: `getGames()`, `getSeasons()`, `getGamePeriods()`, `getAllGamePeriods()`. Re-exports all stats functions.

3. **`src/lib/stats.ts`** — 1137-line pure stats engine (copied verbatim from original). `computeAggregateStats()` produces ~150 stat fields. 10 chart data generator functions.

4. **Server components** (each page's `page.tsx`) fetch data, pass to client components.

5. **Client components** run `computeAggregateStats` via `useMemo`, render the UI.

6. **`/api/games`** — Client-side filtering API route. Dashboard fetches filtered data here when filters are applied.

### Pages

| Route | Component | Description |
|---|---|---|
| `/` | `DashboardClient.tsx` | **Overview** — Simple + Detailed views with filter toggles |
| `/game-log` | `GameLogClient.tsx` | **Game Log** — Full 53-column expandable table with period breakdowns |
| `/period-breakdown` | `PeriodBreakdownClient.tsx` | **Period Breakdown** — Per-period stat cards, comparisons, top performers |
| `/incremental` | `IncrementalClient.tsx` | **Incremental Stats** — Rolling 5/10-game windows with charts + sortable table |
| `/about` | `page.tsx` (static) | **About** — What is this, navigation guide, glossary of 33 terms |
| `/admin` | `page.tsx` | **Admin** — Auth-gated game CRUD (hidden from public nav) |
| `/admin/login` | `page.tsx` | **Login** — Supabase email/password auth |

### Overview Page — Two Views

**Simple View** (default):
- Hero section: Games Played (96px) | Shots Faced (96px, accent)
- Stat strip: SV%, GAA, Record, GSAx, Shutouts (5 cells)
- Charts: SV% vs Expected (area+line), SV% Distribution (bar), GA Distribution (horizontal bar), Goals by Grade (horizontal bar, grade-colored)
- Table row (3-col): Recent Games (scrollable) | Situational Splits | Actual vs Expected + TSA Breakdown
- Bands (3-col): Rebound Control | Glove Performance | Playmaking

**Detailed View**:
- Row 1: Overall Stats (narrower, ~60%) + Grade Cards (2×2 grid, ~40%, worst highlighted red)
- Row 2: Shot Stats + GA Stats (grid-2, both use two-column paired `overall-grid` layout)
- Row 3: SOG Distribution + Shots by Grade + TSA Breakdown (3 charts)
- Row 4: Rebound Stats + Glove Stats (grid-2, paired layout)
- Row 5: Playmaking Stats + PK Stats (grid-2, paired layout)
- Row 6: SV% Distribution + GA Distribution + Times Pulled (3 charts)
- Row 7: Shot Distribution Across Periods + High/Low/Regular Shot Games (2 charts)
- Row 8: Past Games Performance (rolling 5/10/20 + top saves/GA tables)
- Conditional: B2B Stats, Playoff Stats

### Design System (Bold Rounded)

**Colors** (CSS custom properties in `:root`):
```
--bg: #FFFFFA          Warm off-white background
--surface: #F5F5F0     Card background
--surface-2: #EBEBD6   Deeper surface (tooltips, inputs)
--accent: #E94F37      Red-orange brand accent
--accent-dim: rgba(233,79,55,0.10)  Translucent accent
--primary: #3F88C5     Blue (charts, data fills)
--text-1: #393E41      Primary text
--text-2: #6A6F72      Secondary text (labels)
--text-3: #A0A4A6      Tertiary text (eyebrows)
--border: #E4E4DE      Borders, dividers
--good: #1E7A45        Positive deltas, wins
--bad: #C62828         Negative deltas, losses
--neutral-result: #8C6E4A  OTL results
```

**Cards**: 24px border-radius, subtle border (`rgba(0,0,0,0.05)`), soft shadow. Title (15px Work Sans 600) + 24px×2px accent underline.

**Typography**: Darker Grotesque for numbers/display (hero 96px/900, stat strip 30px/800, values 20px/700). Work Sans for body/labels (12.5px tables, 9.5px uppercase headers).

**Charts** (Recharts): `#3F88C5` primary fill, bars radius `[10,10,0,0]`, opacity 0.85. Warm tooltips (#EBEBD6 bg, 14px radius). Grade colors: A+ gray, A accent, B warm, C green.

**Responsive**: Single breakpoint at 880px — collapses to single column, hides nav links, shows mobile menu.

### Supabase Connection

**Env vars** (`.env.local`, gitignored):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Clients**:
- `src/lib/supabase/server.ts` — Server client with cookies (used in server components + server actions)
- `src/lib/supabase/client.ts` — Browser client (used in admin page)
- `src/middleware.ts` — Session refresh for `/admin/*` routes

**Auth**: Supabase email/password for admin only. Public pages have no auth.

### Key Files

| File | Purpose | Lines |
|---|---|---|
| `src/app/DashboardClient.tsx` | Overview — Simple + Detailed views, all charts | ~750 |
| `src/lib/stats.ts` | Stats engine (copied from original) | ~1137 |
| `src/lib/types/database.ts` | TypeScript types for all data | ~256 |
| `src/app/globals.css` | Design system CSS + utilities | ~550 |
| `src/lib/chart-theme.ts` | Recharts theming constants | ~70 |
| `src/components/Navigation.tsx` | Top nav (3-col grid) | ~100 |
| `src/components/FilterBar.tsx` | View + filter toggles | ~120 |

### Relationship to Other Versions

- **V1** (`../V1/`) — Original Next.js app with dark theme, Tailwind, Recharts. V4's data layer is copied from here.
- **V3** (`../V3/`) — Standalone HTML artifact with the Bold Rounded design system. V4's visual design is based on this.
- **Original** (`C:\Stats website\goalie-stats`) — The production Supabase-connected site. V4's data layer (types, stats, queries, Supabase clients, API routes, admin actions) is copied verbatim from here.

### Domain Concepts

- **Shot grading**: A+/A/B/C grades for both shots faced and goals allowed (measures shot quality)
- **Rebound/Glove/Playmaking**: Green (good) / Red (bad) / Black (neutral) tracking for specific skills
- **TSA vs SOG**: Total Shot Attempts (includes blocked/missed) vs Shots on Goal (on-target only)
- **xGA / xSV%**: Expected goals against / expected save percentage (analytics metrics)
- **GSAx**: Goals Saved Above Expected = SV% − xSV% (positive = better than expected)
- **TOI**: Time on Ice, stored as "MM:SS" or "H:MM:SS" strings

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
