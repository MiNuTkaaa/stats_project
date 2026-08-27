import { createClient } from "@/lib/supabase/server";
import type { GameComputed, GamePeriodComputed } from "@/lib/types/database";

// Re-export shared stats/chart functions for convenience in server components
export {
  computeAggregateStats,
  getSvPctDistribution,
  getGADistribution,
  getSOGDistribution,
  getGoalsByGrade,
  getShotsByGrade,
  getFinishTypeDistribution,
  getShotVolumeDistribution,
  getHighLowRegularShotGames,
  getTSABreakdown,
  getTimesPulledByPeriod,
  getShotDistributionByPeriod,
  parseTOIMinutes,
  formatMinutes,
  formatHoursMinutes,
} from "@/lib/stats";
export type { AggregateStats, GradeStats, PastGamesStats } from "@/lib/stats";

// ============================================================
// Server-side data fetching (uses next/headers via Supabase)
// ============================================================

/** Get all games (computed view) with optional filters */
export async function getGames(filters?: {
  seasons?: string[];
  dateFrom?: string;
  dateTo?: string;
  playoff?: boolean;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("games_computed")
    .select("*")
    .order("date", { ascending: false });

  if (filters?.seasons?.length) {
    query = query.in("season", filters.seasons);
  }
  if (filters?.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("date", filters.dateTo);
  }
  if (filters?.playoff !== undefined) {
    query = query.eq("playoff", filters.playoff);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as GameComputed[];
}

/** Get distinct seasons, sorted descending */
export async function getSeasons(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games_computed")
    .select("season")
    .not("season", "is", null)
    .order("season", { ascending: false });

  if (error) throw error;

  const unique = [...new Set((data ?? []).map((r) => r.season as string))];
  return unique;
}

/** Get game periods for a specific game */
export async function getGamePeriods(gameId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_periods_computed")
    .select("*")
    .eq("game_id", gameId)
    .order("period", { ascending: true });

  if (error) throw error;
  return data as GamePeriodComputed[];
}

/** Get all game periods (computed view) */
export async function getAllGamePeriods() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_periods_computed")
    .select("*")
    .order("period", { ascending: true });

  if (error) throw error;
  return data as GamePeriodComputed[];
}
