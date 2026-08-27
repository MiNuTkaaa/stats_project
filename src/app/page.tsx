import { getGames, getSeasons, getAllGamePeriods } from "@/lib/queries";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [games, seasons, periods] = await Promise.all([
    getGames(),
    getSeasons(),
    getAllGamePeriods(),
  ]);

  return (
    <DashboardClient
      initialGames={games}
      seasons={seasons}
      periods={periods}
    />
  );
}
