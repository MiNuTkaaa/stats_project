"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteGame, signOut } from "@/app/admin/actions";
import GameEntryModal from "@/app/admin/GameEntryModal";
import type { Game, GamePeriod } from "@/lib/types/database";

type GameWithPeriods = Game & { game_periods: GamePeriod[] };

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameWithPeriods[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithPeriods | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Quick stats
  const totalGames = games.length;
  const totalGA = games.reduce((sum, g) => sum + g.ga, 0);
  const totalSOG = games.reduce((sum, g) => sum + g.sog, 0);
  const avgSvPct =
    totalSOG > 0 ? (((totalSOG - totalGA) / totalSOG) * 100).toFixed(1) : "—";

  const fetchUser = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      router.push("/admin/login");
      return;
    }
    setUser(u);
  }, [supabase, router]);

  const fetchGames = useCallback(async () => {
    const { data } = await supabase
      .from("games")
      .select("*, game_periods(*)")
      .order("date", { ascending: false })
      .limit(50);
    if (data) setGames(data as unknown as GameWithPeriods[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUser();
    fetchGames();
  }, [fetchUser, fetchGames]);

  function handleEdit(game: GameWithPeriods) {
    setEditingGame(game);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingGame(undefined);
    setModalOpen(true);
  }

  function handleDelete(gameId: string) {
    startTransition(async () => {
      await deleteGame(gameId);
      setDeleteConfirm(null);
      fetchGames();
    });
  }

  function handleModalSuccess() {
    fetchGames();
  }

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return (
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <span style={{ color: "var(--text-3)", fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 28, color: "var(--text-1)", lineHeight: 1.1 }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>{user.email}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            href="/"
            style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          >
            &larr; Dashboard
          </a>
          <button
            onClick={handleSignOut}
            className="admin-btn secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--gap)", marginBottom: 28 }}>
        <div className="stat-cell has-bar">
          <div className="stat-cell-label">Games</div>
          <div className="stat-cell-value">{totalGames}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Total GA</div>
          <div className="stat-cell-value">{totalGA}</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">SV%</div>
          <div className="stat-cell-value">{avgSvPct}%</div>
        </div>
      </div>

      {/* Games List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 26px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="card-title">Recent Games</div>
            <div className="card-underline" />
          </div>
          <button
            onClick={handleNew}
            className="admin-btn"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
          >
            <Plus size={14} />
            Add Game
          </button>
        </div>

        {games.length === 0 ? (
          <div style={{ padding: "48px 26px", textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            No games entered yet. Click &ldquo;Add Game&rdquo; to add your first game.
          </div>
        ) : (
          <div style={{ overflowX: "auto", padding: "0 26px 20px" }}>
            <table className="bold-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>H/A</th>
                  <th>GA</th>
                  <th>SOG</th>
                  <th style={{ minWidth: 48 }}>TSA</th>
                  <th>Periods</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>{game.date}</td>
                    <td style={{ fontWeight: 500 }}>{game.opponent}</td>
                    <td>{game.score}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: game.home_away === "H" ? "var(--accent-dim)" : "rgba(63, 136, 197, 0.1)",
                          color: game.home_away === "H" ? "var(--accent)" : "var(--primary)",
                        }}
                      >
                        {game.home_away}
                      </span>
                    </td>
                    <td>{game.ga}</td>
                    <td>{game.sog}</td>
                    <td>{game.tsa}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                        {game.game_periods
                          ?.sort((a, b) => {
                            const order = ["Period 1", "Period 2", "Period 3", "OT", "SO"];
                            const norm = (n: string) => ({ P1: "Period 1", P2: "Period 2", P3: "Period 3" }[n] ?? n);
                            return (
                              order.indexOf(norm(a.period)) -
                              order.indexOf(norm(b.period))
                            );
                          })
                          .map((p) => (
                            <span
                              key={p.id}
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10,
                                background: "var(--surface-2)",
                                color: "var(--text-3)",
                              }}
                            >
                              {p.period}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <button
                          onClick={() => handleEdit(game)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 6,
                            borderRadius: 8,
                            color: "var(--text-3)",
                            cursor: "pointer",
                            transition: "color 0.15s, background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--text-1)";
                            e.currentTarget.style.background = "var(--surface-2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--text-3)";
                            e.currentTarget.style.background = "none";
                          }}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirm === game.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <button
                              onClick={() => handleDelete(game.id)}
                              disabled={isPending}
                              className="admin-btn danger"
                              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 8, opacity: isPending ? 0.5 : 1 }}
                            >
                              {isPending ? "..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="admin-btn secondary"
                              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 8 }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(game.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 6,
                              borderRadius: 8,
                              color: "var(--text-3)",
                              cursor: "pointer",
                              transition: "color 0.15s, background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "var(--bad)";
                              e.currentTarget.style.background = "rgba(198, 40, 40, 0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-3)";
                              e.currentTarget.style.background = "none";
                            }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Game Entry Modal */}
      <GameEntryModal
        key={editingGame?.id ?? "new"}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGame(undefined);
        }}
        onSuccess={handleModalSuccess}
        editGame={editingGame}
      />
    </div>
  );
}
