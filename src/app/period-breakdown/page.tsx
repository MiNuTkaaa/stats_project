import { getGames, getSeasons, getAllGamePeriods } from "@/lib/queries";
import PeriodBreakdownClient from "./PeriodBreakdownClient";

export const dynamic = "force-dynamic";

export default async function PeriodBreakdownPage() {
  const [games, seasons, periods] = await Promise.all([
    getGames(),
    getSeasons(),
    getAllGamePeriods(),
  ]);
  return (
    <PeriodBreakdownClient games={games} periods={periods} seasons={seasons} />
  );
}
