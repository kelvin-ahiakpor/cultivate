"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export interface FarmerFlaggedQueryItem {
  id: string;
  farmerMessage: string;
  agentResponse: string;
  agentName: string;
  conversationTitle?: string;
  confidenceScore: number;
  status: "PENDING" | "VERIFIED" | "CORRECTED";
  createdAt: string;
  createdAtIso: string;
  reviewedAt?: string;
  reviewedAtIso?: string;
  agronomistResponse?: string;
  verificationNotes?: string;
  conversationId: string;
  messageId: string;
  farmerReason?: string | null;
  farmerUpdates?: string | null;
}

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
      messages: { content: string }[];
    };
  };
  agent: { id: string; name: string; confidenceThreshold: number };
}

interface FarmerFlaggedQueriesResponse {
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

function normalize(item: RawFlaggedQuery): FarmerFlaggedQueryItem {
  return {
    id: item.id,
    farmerMessage: item.message.conversation.messages[0]?.content || "Message not available",
    agentResponse: item.message.content,
    agentName: item.agent.name,
    conversationTitle: item.message.conversation.title || "Conversation",
    confidenceScore: item.message.confidenceScore ?? 0,
    status: item.status,
    createdAt: formatDate(item.createdAt),
    createdAtIso: item.createdAt,
    reviewedAt: item.reviewedAt ? formatDate(item.reviewedAt) : undefined,
    reviewedAtIso: item.reviewedAt ?? undefined,
    agronomistResponse: item.agronomistResponse ?? undefined,
    verificationNotes: item.verificationNotes ?? undefined,
    conversationId: item.message.conversation.id,
    messageId: item.message.id,
    farmerReason: item.farmerReason,
    farmerUpdates: item.farmerUpdates,
  };
}

export function useFarmerFlaggedQueries(
  status?: string,
  page: number = 1,
  limit: number = 20,
  disabled: boolean = false
) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const { data, error, isLoading, mutate } = useSWR<FarmerFlaggedQueriesResponse>(
    disabled ? null : `/api/farmer/flagged-queries?${params.toString()}`,
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
