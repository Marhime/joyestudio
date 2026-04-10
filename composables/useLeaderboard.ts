import type { LeaderboardEntry } from "~/types/game";
import { getSupabaseClient } from "~/utils/supabase";

/**
 * Composable for the shared leaderboard (Supabase).
 * Falls back gracefully when Supabase is not configured — scores stay local only.
 */
export function useLeaderboard() {
  const topScores = ref<LeaderboardEntry[]>([]);
  const loading = ref(false);

  async function getTopScores(limit = 10): Promise<LeaderboardEntry[]> {
    const sb = getSupabaseClient();
    if (!sb) return [];

    loading.value = true;
    try {
      const { data, error } = await sb
        .from("scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("[leaderboard] fetch error:", error.message);
        return [];
      }

      topScores.value = data as LeaderboardEntry[];
      return topScores.value;
    } finally {
      loading.value = false;
    }
  }

  async function submitScore(
    playerName: string,
    character: "maxime" | "karla",
    score: number,
  ): Promise<boolean> {
    const sb = getSupabaseClient();
    if (!sb) return false;

    const sanitized = playerName.trim().slice(0, 30);
    if (!sanitized) return false;

    const { error } = await sb.from("scores").insert({
      player_name: sanitized,
      character,
      score: Math.max(0, Math.floor(score)),
    });

    if (error) {
      console.warn("[leaderboard] submit error:", error.message);
      return false;
    }
    return true;
  }

  // ── Local best score (always available, even without Supabase) ──────────
  function getLocalBest(): number {
    if (!import.meta.client) return 0;
    return Number(localStorage.getItem("pixelrunner-best") || "0");
  }

  function setLocalBest(score: number) {
    if (!import.meta.client) return;
    const current = getLocalBest();
    if (score > current) {
      localStorage.setItem("pixelrunner-best", String(Math.floor(score)));
    }
  }

  return {
    topScores: readonly(topScores),
    loading: readonly(loading),
    getTopScores,
    submitScore,
    getLocalBest,
    setLocalBest,
  };
}
