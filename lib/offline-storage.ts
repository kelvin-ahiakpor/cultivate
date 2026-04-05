/**
 * offline-storage.ts
 * IndexedDB helpers for PWA offline support.
 *
 * Access layer:
 *   - Cache API  (via serwist/sw)  →  static assets + app shell
 *   - IndexedDB  (this file)       →  structured data for both farmer + agronomist
 *
 * Stores:
 *   v1 - "conversations"  — farmer: 20 most recent convos + messages
 *   v2 - "agro_cache"     — agronomist: agents, KBs, flagged queries, dashboard stats
 *
 * Uses `idb` — a tiny promise-based wrapper around the raw IndexedDB API.
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "cultivate-offline";
const DB_VERSION = 2;
const CONV_STORE = "conversations";
const AGRO_STORE = "agro_cache";
export const MAX_CACHED_CONVERSATIONS = 20;

export interface CachedConversation {
  id: string;
  title: string;
  agentName: string;
  lastMessage: string;
  messageCount: number;
  systemName?: string | null;
  /** Cached timestamp (ms) — used for sorting + pruning */
  cachedAt: number;
}

export interface CachedMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  attachments?: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    attachmentType: "IMAGE";
    width?: number | null;
    height?: number | null;
  }[];
  confidenceScore?: number;
  isFlagged?: boolean;
  flaggedQuery?: {
    id: string;
    status?: "PENDING" | "VERIFIED" | "CORRECTED";
    farmerReason?: string | null;
    farmerUpdates?: string | null;
    agronomistResponse?: string | null;
    verificationNotes?: string | null;
  };
}

interface StoredConversation extends CachedConversation {
  messages?: CachedMessage[];
}

function openCultivateDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(CONV_STORE, { keyPath: "id" });
        store.createIndex("cachedAt", "cachedAt");
      }
      if (oldVersion < 2) {
        // Agronomist cache: generic key-value store
        // Records: { key: string, data: unknown, cachedAt: number }
        db.createObjectStore(AGRO_STORE, { keyPath: "key" });
      }
    },
  });
}

// ─── Agronomist cache helpers ────────────────────────────────────────────────

/** Save any agronomist data blob under a named key */
export async function saveAgroCache<T>(key: string, data: T): Promise<void> {
  const db = await openCultivateDB();
  await db.put(AGRO_STORE, { key, data, cachedAt: Date.now() });
}

/** Read a cached agronomist data blob. Returns null if not cached. */
export async function getAgroCache<T>(
  key: string
): Promise<{ data: T; cachedAt: number } | null> {
  const db = await openCultivateDB();
  const record = await db.get(AGRO_STORE, key) as { key: string; data: T; cachedAt: number } | undefined;
  if (!record) return null;
  return { data: record.data, cachedAt: record.cachedAt };
}

/**
 * Format a cachedAt timestamp as a human-readable age string.
 * e.g. "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatCacheAge(cachedAt: number): string {
  const mins = Math.floor((Date.now() - cachedAt) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Persist the top MAX_CACHED_CONVERSATIONS conversations.
 * Merges: existing cached messages are preserved so we don't lose message
 * data just because the list refreshed without re-fetching messages.
 * Stale entries (no longer in the incoming list) are pruned.
 */
export async function saveConversationList(
  conversations: Omit<CachedConversation, "cachedAt">[]
): Promise<void> {
  const db = await openCultivateDB();
  const tx = db.transaction(CONV_STORE, "readwrite");

  const top20 = conversations.slice(0, MAX_CACHED_CONVERSATIONS);
  const keepIds = new Set(top20.map((c) => c.id));

  // Upsert each conversation, preserving existing messages
  for (const conv of top20) {
    const existing = (await tx.store.get(conv.id)) as StoredConversation | undefined;
    await tx.store.put({
      ...conv,
      cachedAt: Date.now(),
      messages: existing?.messages,
    });
  }

  // Prune entries no longer in the top 20
  const all = (await tx.store.getAll()) as StoredConversation[];
  for (const cached of all) {
    if (!keepIds.has(cached.id)) {
      await tx.store.delete(cached.id);
    }
  }

  await tx.done;
}

/**
 * Read back cached conversations (newest first).
 * Messages are stripped — use getConversationMessages() for those.
 */
export async function getConversationList(): Promise<CachedConversation[]> {
  const db = await openCultivateDB();
  const all = (await db.getAll(CONV_STORE)) as StoredConversation[];
  return all
    .map(({ messages: _messages, ...conv }) => conv)
    .sort((a, b) => b.cachedAt - a.cachedAt);
}

/**
 * Attach messages to a cached conversation entry.
 * No-ops gracefully if the conversation isn't in the cache yet
 * (the next list refresh will add it).
 */
export async function saveConversationMessages(
  conversationId: string,
  messages: CachedMessage[]
): Promise<void> {
  const db = await openCultivateDB();
  const existing = (await db.get(CONV_STORE, conversationId)) as StoredConversation | undefined;
  if (!existing) return;
  await db.put(CONV_STORE, { ...existing, messages, cachedAt: Date.now() });
}

/**
 * Retrieve cached messages for a conversation.
 * Returns null if the conversation isn't cached or has no messages yet.
 */
export async function getConversationMessages(
  conversationId: string
): Promise<CachedMessage[] | null> {
  const db = await openCultivateDB();
  const conv = (await db.get(CONV_STORE, conversationId)) as StoredConversation | undefined;
  return conv?.messages ?? null;
}
