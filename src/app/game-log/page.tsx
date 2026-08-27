import { getGames, getSeasons, getAllGamePeriods } from "@/lib/queries";
import GameLogClient from "./GameLogClient";

export const dynamic = "force-dynamic";

export default async function GameLogPage() {
  const [games, seasons, periods] = await Promise.all([
    getGames(),
    getSeasons(),
    getAllGamePeriods(),
  ]);
  return (
    <GameLogClient games={games} periods={periods} seasons={seasons} />
  );
}
