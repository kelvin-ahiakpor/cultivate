"use client";

import useSWR, { type KeyedMutator } from "swr";
import { useCallback } from "react";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// Normalised shape matching what the view expects — same fields as initialFlagged mock
export interface FlaggedQueryItem {
  id: string;
  messageId: string;
  farmerName: string;
  farmerMessage: string;  // most recent USER message in the conversation
  agentResponse: string;  // the ASSISTANT message that was flagged
  agentName: string;
  conversationTitle?: string;
  confidenceScore: number;
  status: "PENDING" | "VERIFIED" | "CORRECTED";
  createdAt: string;      // formatted display string
  reviewedAt?: string;
  agronomistResponse?: string;
  verificationNotes?: string;
  conversationId: string;
  farmerReason?: string | null;    // Farmer's initial flag reason (with timestamp)
  farmerUpdates?: string | null;   // Farmer's flag updates (timestamped, newline-separated)
}

// Raw shape returned by the API
interface RawFlaggedQuery {
  id: string;
  status: "PENDING" | "VERIFIED" | "CORRECTED";
  farmerReason: string | null;
  farmerUpdates: string | null;
  agronomistResponse: string | null;
  verificationNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  message: {
    id: string;
    content: string;
    confidenceScore: number | null;
    conversation: {
      id: string;
      title: string;
      farmer: { id: string; name: string };
      messages: { content: string }[]; // most recent USER message
    };
  };
  agent: { id: string; name: string; confidenceThreshold: number };
}

interface FlaggedQueriesResponse {
  flaggedQueries: RawFlaggedQuery[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function normalizeConversationTitle(title?: string | null): string {
  return (title || "Conversation").replace(/^#+\s*/, "");
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalize(fq: RawFlaggedQuery): FlaggedQueryItem {
  return {
    id: fq.id,
    messageId: fq.message.id,
    farmerName: fq.message.conversation.farmer.name,
    farmerMessage: fq.message.conversation.messages[0]?.content || "Message not available",
    agentResponse: fq.message.content,
    agentName: fq.agent.name,
    conversationTitle: normalizeConversationTitle(fq.message.conversation.title),
    confidenceScore: fq.message.confidenceScore ?? 0,
    status: fq.status,
    createdAt: formatDate(fq.createdAt),
    reviewedAt: fq.reviewedAt ? formatDate(fq.reviewedAt) : undefined,
    agronomistResponse: fq.agronomistResponse ?? undefined,
    verificationNotes: fq.verificationNotes ?? undefined,
    conversationId: fq.message.conversation.id,
    farmerReason: fq.farmerReason,
    farmerUpdates: fq.farmerUpdates,
  };
}

// Apply an optimistic patch to the raw cache — avoids re-fetching for instant UI
function applyOptimisticPatch(
  current: FlaggedQueriesResponse | undefined,
  id: string,
  patch: Partial<RawFlaggedQuery>,
  fallback: FlaggedQueriesResponse
): FlaggedQueriesResponse {
  const base = current ?? fallback;
  return {
    ...base,
    flaggedQueries: base.flaggedQueries.map((q) =>
      q.id === id ? { ...q, ...patch } : q
    ),
  };
}

/**
 * Hook to fetch and mutate flagged queries.
 *
 * Optimistic update strategy:
 *   reviewQuery / revokeQuery patch the SWR cache instantly (optimisticData),
 *   fire the real API call, then revalidate so the cache converges to server truth.
 *   SWR rolls back automatically if the API call throws (rollbackOnError: true).
 *
 * @param search - Filter by farmer name or message
 * @param status - "PENDING" | "VERIFIED" | "CORRECTED" | "" (all)
 * @param page - 1-indexed
 * @param limit - Items per page
 * @param disabled - Pass true in demo mode → null SWR key → zero network requests
 */
export function useFlaggedQueries(
  search?: string,
  status?: string,
  page: number = 1,
  limit: number = 10,
  disabled: boolean = false
) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const emptyResponse: FlaggedQueriesResponse = {
    flaggedQueries: [],
    pagination: { page, limit, total: 0, totalPages: 1 },
  };

  const { data, error, isLoading, mutate } = useSWR<FlaggedQueriesResponse>(
    disabled ? null : `/api/flagged-queries?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  /**
   * Optimistically verify or correct a flagged query.
   * Status badge updates instantly; SWR revalidates once the API resolves.
   */
  const reviewQuery = useCallback(
    async (
      id: string,
      payload: {
        status: "VERIFIED" | "CORRECTED";
        agronomistResponse?: string;
        verificationNotes?: string;
      }
    ) => {
      const now = new Date().toISOString();
      await (mutate as KeyedMutator<FlaggedQueriesResponse>)(
        async () => {
          const res = await fetch(`/api/flagged-queries/${id}/review`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Review failed");
          }
          // Return undefined → SWR revalidates from server after mutation
          return undefined;
        },
        {
          optimisticData: (current) =>
            applyOptimisticPatch(current, id, {
              status: payload.status,
              reviewedAt: now,
              agronomistResponse: payload.agronomistResponse ?? null,
              verificationNotes: payload.verificationNotes ?? null,
            }, emptyResponse),
          rollbackOnError: true,
          revalidate: true,
        }
      );
    },
    [mutate]
  );

  /**
   * Optimistically revoke a review back to PENDING.
   * Status badge updates instantly; SWR revalidates once the API resolves.
   */
  const revokeQuery = useCallback(
    async (id: string) => {
      await (mutate as KeyedMutator<FlaggedQueriesResponse>)(
        async () => {
          const res = await fetch(`/api/flagged-queries/${id}/revoke`, {
            method: "PATCH",
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Revoke failed");
          }
          return undefined;
        },
        {
          optimisticData: (current) =>
            applyOptimisticPatch(current, id, {
              status: "PENDING",
              reviewedAt: null,
              agronomistResponse: null,
              verificationNotes: null,
            }, emptyResponse),
          rollbackOnError: true,
          revalidate: true,
        }
      );
    },
    [mutate, emptyResponse]
  );

  return {
    queries: (data?.flaggedQueries || []).map(normalize),
    total: data?.pagination.total || 0,
    totalPages: data?.pagination.totalPages || 1,
    isLoading,
    isError: error,
    mutate,
    reviewQuery,
    revokeQuery,
  };
}
