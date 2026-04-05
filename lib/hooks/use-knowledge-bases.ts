"use client";

import useSWR from "swr";

export class KnowledgeBaseUploadError extends Error {
  code?: string;
  document?: {
    id: string;
    title: string;
    fileName: string;
    agentId: string;
    agentName: string;
  };
}

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// Normalised shape used by the view — same fields as mockDocuments
export interface KnowledgeDoc {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;      // "PDF" | "DOCX" | "TXT"
  chunkCount: number;
  agentId: string;       // Primary agent ID
  agentName: string;     // Primary agent name
  agents: Array<{ id: string; name: string; isPrimary: boolean }>; // All agents
  uploadedAt: string;    // formatted display string e.g. "Jan 28, 2026"
  uploadedAtIso: string;
  status: string;
  referencedInChats: number; // 0 for real data — API doesn't return this yet
  processingState: "READY" | "PROCESSING" | "FAILED";
}

interface RawDoc {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  chunkCount: number;
  uploadedAt: string; // ISO
  status: string;
  referencedInChats?: number;
  agents: Array<{ isPrimary: boolean; agent: { id: string; name: string } }>;
}

function getProcessingState(chunkCount: number): KnowledgeDoc["processingState"] {
  if (chunkCount < 0) return "FAILED";
  if (chunkCount === 0) return "PROCESSING";
  return "READY";
}

interface KnowledgeBasesResponse {
  documents: RawDoc[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalize(doc: RawDoc): KnowledgeDoc {
  const primaryAgent = doc.agents.find((a) => a.isPrimary);
  const agentsList = doc.agents.map((a) => ({
    id: a.agent.id,
    name: a.agent.name,
    isPrimary: a.isPrimary,
  }));

  return {
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    fileType: doc.fileType.toUpperCase(),
    chunkCount: doc.chunkCount,
    agentId: primaryAgent?.agent.id || "",
    agentName: primaryAgent?.agent.name || "Unassigned",
    agents: agentsList,
    uploadedAt: formatDate(doc.uploadedAt),
    uploadedAtIso: doc.uploadedAt,
    status: doc.status,
    referencedInChats: doc.referencedInChats ?? 0,
    processingState: getProcessingState(doc.chunkCount),
  };
}

/**
 * Hook to fetch knowledge base documents.
 * @param search - Filter by title
 * @param agentId - Filter by agent ID (empty = all)
 * @param page - 1-indexed
 * @param limit - Items per page
 * @param disabled - Pass true in demo mode → null SWR key → zero network requests
 */
export function useKnowledgeBases(
  search?: string,
  agentId?: string,
  page: number = 1,
  limit: number = 30,
  disabled: boolean = false
) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (agentId) params.append("agentId", agentId);
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  const { data, error, isLoading, mutate } = useSWR<KnowledgeBasesResponse>(
    disabled ? null : `/api/knowledge-bases?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: (response?: KnowledgeBasesResponse) =>
        response?.documents?.some((doc) => doc.chunkCount === 0) ? 5000 : 0,
    }
  );

  return {
    documents: (data?.documents || []).map(normalize),
    total: data?.pagination.total || 0,
    totalPages: data?.pagination.totalPages || 1,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Upload a new document to the knowledge base.
 * FormData fields: file, title, agentId
 */
export async function uploadDocument(formData: FormData) {
  const res = await fetch("/api/knowledge-bases/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    const uploadError = new KnowledgeBaseUploadError(err.error || "Upload failed");
    uploadError.code = err.code;
    uploadError.document = err.document;
    throw uploadError;
  }
  return res.json();
}

/**
 * Delete a knowledge base document by ID.
 * Also removes chunks from pgvector and file from Supabase Storage.
 */
export async function deleteDocument(id: string) {
  const res = await fetch(`/api/knowledge-bases/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Delete failed");
  }
  return res.json();
}

/**
 * Rename a knowledge base document by ID.
 * Updates only the human-readable title, not the underlying file name.
 */
export async function renameDocument(id: string, title: string) {
  const res = await fetch(`/api/knowledge-bases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Rename failed");
  }

  return res.json();
}

export async function assignDocumentToAgent(id: string, agentId: string) {
  const res = await fetch(`/api/knowledge-bases/${id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Assignment failed");
  }

  return res.json();
}
