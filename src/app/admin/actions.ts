"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GameInsert, GamePeriodInsert } from "@/lib/types/database";

export async function createGame(
  game: GameInsert,
  periods: Omit<GamePeriodInsert, "game_id">[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Auto-detect OT/SO from periods
  const hasOT = periods.some((p) => p.period === "OT");
  const hasSO = periods.some((p) => p.period === "SO");

  // Insert game
  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .insert({ ...game, ot: hasOT, so: hasSO })
    .select()
    .single();

  if (gameError) throw new Error(gameError.message);

  // Insert periods
  if (periods.length > 0) {
    const periodRows = periods.map((p) => ({
      ...p,
      game_id: gameData.id,
    }));
    const { error: periodError } = await supabase
      .from("game_periods")
      .insert(periodRows);
    if (periodError) throw new Error(periodError.message);
  }

  revalidatePath("/admin");
  return gameData;
}

export async function updateGame(
  gameId: string,
  game: Partial<GameInsert>,
  periods: Omit<GamePeriodInsert, "game_id">[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Auto-detect OT/SO from periods
  const hasOT = periods.some((p) => p.period === "OT");
  const hasSO = periods.some((p) => p.period === "SO");

  // Update game
  const { error: gameError } = await supabase
    .from("games")
    .update({ ...game, ot: hasOT, so: hasSO })
    .eq("id", gameId);

  if (gameError) throw new Error(gameError.message);

  // Delete existing periods and re-insert
  const { error: deleteError } = await supabase
    .from("game_periods")
    .delete()
    .eq("game_id", gameId);

  if (deleteError) throw new Error(deleteError.message);

  if (periods.length > 0) {
    const periodRows = periods.map((p) => ({
      ...p,
      game_id: gameId,
    }));
    const { error: periodError } = await supabase
      .from("game_periods")
      .insert(periodRows);
    if (periodError) throw new Error(periodError.message);
  }

  revalidatePath("/admin");
}

export async function deleteGame(gameId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Periods are deleted via cascade or we delete them first
  const { error: periodError } = await supabase
    .from("game_periods")
    .delete()
    .eq("game_id", gameId);

  if (periodError) throw new Error(periodError.message);

  const { error: gameError } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);

  if (gameError) throw new Error(gameError.message);

  revalidatePath("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/admin");
}
