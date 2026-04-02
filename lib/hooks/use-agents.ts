"use client";

import useSWR from "swr";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

// Agent type matching Prisma schema + API counts
export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  responseStyle: string | null;
  confidenceThreshold: number;
  isActive: boolean;
  version: number;
  agronomistId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  // Counts from API
  conversations?: number;
  knowledgeBases?: number;
  flaggedQueries?: number;
}

interface AgentsResponse {
  agents: Agent[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Hook to fetch agents list
 * @param search - Search query (filters by agent name)
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param disabled - If true, prevents fetching (useful for demo mode)
 */
export function useAgents(search?: string, page: number = 1, limit: number = 10, disabled: boolean = false) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  // If disabled (demo mode), pass null as key to prevent fetch
  const { data, error, isLoading, mutate } = useSWR<AgentsResponse>(
    disabled ? null : `/api/agents?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Do refetch on reconnect
    }
  );

  return {
    agents: data?.agents || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || limit,
    isLoading,
    isError: error,
    mutate, // Expose mutate for manual cache updates
  };
}

/**
 * Hook to fetch single agent details
 */
export function useAgent(id: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error, isLoading, mutate } = useSWR<any>(
    id ? `/api/agents/${id}` : null,
    fetcher
  );

  // Normalize: single-agent GET returns knowledgeBases as an array (relation)
  // and counts under _count. Flatten into the Agent shape so views stay simple.
  const agent: Agent | undefined = data
    ? {
        ...data,
        conversations: data._count?.conversations ?? data.conversations ?? 0,
        knowledgeBases: Array.isArray(data.knowledgeBases)
          ? data.knowledgeBases.length
          : (data._count?.knowledgeBases ?? data.knowledgeBases ?? 0),
        flaggedQueries: data._count?.flaggedQueries ?? data.flaggedQueries ?? 0,
      }
    : undefined;

  return {
    agent,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Create a new agent
 */
export async function createAgent(data: {
  name: string;
  systemPrompt: string;
  responseStyle?: string;
  confidenceThreshold?: number;
}) {
  const res = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create agent");
  }

  return res.json();
}

/**
 * Update an existing agent
 */
export async function updateAgent(id: string, data: {
  name?: string;
  systemPrompt?: string;
  responseStyle?: string;
  confidenceThreshold?: number;
}) {
  const res = await fetch(`/api/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update agent");
  }

  return res.json();
}

/**
 * Toggle agent active status
 */
export async function toggleAgentStatus(id: string, isActive: boolean) {
  const res = await fetch(`/api/agents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to toggle agent status");
  }

  return res.json();
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string) {
  const res = await fetch(`/api/agents/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete agent");
  }

  return res.json();
}
