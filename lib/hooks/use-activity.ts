/**
 * use-activity.ts
 * SWR hook for the Recent Activity feed on the dashboard overview.
 * Pass disabled=true in demo mode to make zero API requests.
 * See BACKEND-PROGRESS.md § Phase 5 for the demo mode pattern.
 */
import useSWR from "swr";

export interface ActivityItem {
  type:
    | "flagged_created"
    | "flagged_verified"
    | "flagged_corrected"
    | "conversation_started"
    | "agent_created"
    | "knowledge_uploaded";
  description: string;
  agentName: string | null;
  metadata: Record<string, unknown>;
  /** ISO timestamp string */
  timestamp: string;
}

interface ActivityResult {
  activities: ActivityItem[];
  isLoading: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

/** Convert ISO date string to a short relative time label */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function useActivity(
  days = 7,
  limit = 20,
  /** Set true in demo mode — passes null key to SWR so zero requests are made */
  disabled?: boolean
): ActivityResult {
  const { data, isLoading } = useSWR(
    disabled ? null : `/api/activity?days=${days}&limit=${limit}`,
    fetcher
  );

  return {
    activities: data?.activities ?? [],
    isLoading,
  };
}
