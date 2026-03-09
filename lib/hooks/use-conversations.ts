/**
 * use-conversations.ts
 * SWR hook for fetching conversations (dashboard chats view).
 * Pass disabled=true in demo mode to make zero API requests.
 * See BACKEND-PROGRESS.md § Phase 5 for the demo mode pattern.
 */
import useSWR from "swr";

export interface ConversationItem {
  id: string;
  title: string;
  farmerName: string;
  agentName: string;
  /** Relative or formatted time string, e.g. "2 hours ago" */
  lastMessage: string;
  messageCount: number;
}

interface ConversationsResponse {
  conversations: ConversationItem[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  mutate: () => void;
}

/** Convert ISO date string to a short relative time label */
function relativeTime(iso: string): string {
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

/** Flatten API response to a display-ready shape */
function normalize(raw: {
  id: string;
  title?: string | null;
  agent: { name: string };
  farmer: { name: string };
  lastMessage?: { createdAt: string } | null;
  _count: { messages: number };
}): ConversationItem {
  return {
    id: raw.id,
    title: raw.title || "Untitled conversation",
    agentName: raw.agent.name,
    farmerName: raw.farmer.name,
    lastMessage: raw.lastMessage ? relativeTime(raw.lastMessage.createdAt) : "No messages",
    messageCount: raw._count.messages,
  };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useConversations(
  search: string,
  page: number,
  limit: number,
  /** Set true in demo mode — passes null key to SWR so zero requests are made */
  disabled?: boolean
): ConversationsResponse {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", String(limit));

  // null key tells SWR to skip the fetch entirely (demo mode)
  const key = disabled ? null : `/api/conversations?${params}`;
  const { data, isLoading, mutate } = useSWR(key, fetcher);

  const raw = data?.data?.conversations ?? [];
  return {
    conversations: raw.map(normalize),
    total: data?.data?.pagination?.total ?? 0,
    totalPages: data?.data?.pagination?.totalPages ?? 1,
    isLoading,
    mutate,
  };
}
