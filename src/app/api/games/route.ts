import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GameComputed } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const seasons = searchParams.get("seasons")?.split(",").filter(Boolean);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const supabase = await createClient();
  let query = supabase
    .from("games_computed")
    .select("*")
    .order("date", { ascending: false });

  if (seasons?.length) {
    query = query.in("season", seasons);
  }
  if (dateFrom) {
    query = query.gte("date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("date", dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as GameComputed[]);
}
