/**
 * use-dashboard-stats.ts
 * SWR hook for the three overview stat cards (Active Agents, Knowledge Docs, Pending Flags).
 * Pass disabled=true in demo mode to make zero API requests.
 * See BACKEND-PROGRESS.md § Phase 5 for the demo mode pattern.
 */
import useSWR from "swr";

export interface DashboardStats {
  activeAgents: number;
  knowledgeDocs: number;
  pendingFlags: number;
}

interface DashboardStatsResult {
  stats: DashboardStats | null;
  isLoading: boolean;
  mutate: () => void;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useDashboardStats(
  /** Set true in demo mode — passes null key to SWR so zero requests are made */
  disabled?: boolean
): DashboardStatsResult {
  // null key tells SWR to skip the fetch entirely (demo mode)
  const { data, isLoading, mutate } = useSWR(
    disabled ? null : "/api/dashboard/stats",
    fetcher
  );

  return {
    stats: data ?? null,
    isLoading,
    mutate,
  };
}
