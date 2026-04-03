"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// Normalised shape matching what the view expects — same fields as initialFlagged mock
export interface FlaggedQueryItem {
  id: string;
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
    farmerName: fq.message.conversation.farmer.name,
    farmerMessage: fq.message.conversation.messages[0]?.content || "Message not available",
    agentResponse: fq.message.content,
    agentName: fq.agent.name,
    conversationTitle: fq.message.conversation.title || "Conversation",
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

/**
 * Hook to fetch flagged queries.
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

  const { data, error, isLoading, mutate } = useSWR<FlaggedQueriesResponse>(
    disabled ? null : `/api/flagged-queries?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    queries: (data?.flaggedQueries || []).map(normalize),
    total: data?.pagination.total || 0,
    totalPages: data?.pagination.totalPages || 1,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Verify or correct a flagged query.
 * @param id - FlaggedQuery ID
 * @param payload - { status: "VERIFIED" | "CORRECTED", agronomistResponse?, verificationNotes? }
 */
export async function reviewFlaggedQuery(
  id: string,
  payload: {
    status: "VERIFIED" | "CORRECTED";
    agronomistResponse?: string;
    verificationNotes?: string;
  }
) {
  const res = await fetch(`/api/flagged-queries/${id}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Review failed");
  }
  return res.json();
}
