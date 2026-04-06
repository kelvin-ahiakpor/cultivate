# Cultivate — Backend Implementation Progress

> Tracks what was actually built, how it works, and where to find it.
> For the *plan*, see `BACKEND-PLAN.md`. For project-wide context, see `CLAUDE.md`.
> Frontend refactoring history is also tracked here (component architecture, a11y, etc.).

**Last Updated:** April 5, 2026

---

## Phase 1: Core API Routes ✅ (Completed Feb 22)

### What was built
All CRUD API routes for the five main resources. Every route is auth-gated, org-scoped, and role-checked.

### Shared Utilities — `lib/api-utils.ts`
- `requireAuth()` — gets session via NextAuth's `auth()`, returns 401 if not logged in
- `hasRole(userRole, ...allowedRoles)` — checks if user has required role
- `apiError(message, status)` — consistent JSON error response
- `apiSuccess(data, status)` — consistent JSON success response

### Agents API
| File | Method | Endpoint | What it does |
|------|--------|----------|-------------|
| `app/api/agents/route.ts` | GET | `/api/agents` | List agents with pagination, search, conversation/knowledge/flagged counts |
| `app/api/agents/route.ts` | POST | `/api/agents` | Create agent (name, systemPrompt, responseStyle, confidenceThreshold) |
| `app/api/agents/[id]/route.ts` | GET | `/api/agents/:id` | Get agent with full details + knowledge bases |
| `app/api/agents/[id]/route.ts` | PUT | `/api/agents/:id` | Update agent fields, auto-increments version |
| `app/api/agents/[id]/route.ts` | DELETE | `/api/agents/:id` | Delete agent (cascades via Prisma) |
| `app/api/agents/[id]/status/route.ts` | PATCH | `/api/agents/:id/status` | Toggle isActive boolean |

### Conversations API
| File | Method | Endpoint | What it does |
|------|--------|----------|-------------|
| `app/api/conversations/route.ts` | GET | `/api/conversations` | List conversations — farmers see own, agronomists see org's |
| `app/api/conversations/route.ts` | POST | `/api/conversations` | Create conversation (must specify an active agent) |
| `app/api/conversations/[id]/route.ts` | GET | `/api/conversations/:id` | Get conversation with agent + farmer info |
| `app/api/conversations/[id]/route.ts` | PUT | `/api/conversations/:id` | Rename conversation title |
| `app/api/conversations/[id]/route.ts` | DELETE | `/api/conversations/:id` | Delete conversation + all messages (cascade) |

### Messages API
| File | Method | Endpoint | What it does |
|------|--------|----------|-------------|
| `app/api/conversations/[id]/messages/route.ts` | GET | `/api/conversations/:id/messages` | List messages with cursor-based pagination |
| `app/api/conversations/[id]/messages/route.ts` | POST | `/api/conversations/:id/messages` | Send message + get AI response (see Phase 2 below) |

### Knowledge Bases API
| File | Method | Endpoint | What it does |
|------|--------|----------|-------------|
| `app/api/knowledge-bases/route.ts` | GET | `/api/knowledge-bases` | List documents with agent filter, search, pagination |
| `app/api/knowledge-bases/[id]/route.ts` | GET | `/api/knowledge-bases/:id` | Get document details |
| `app/api/knowledge-bases/[id]/route.ts` | DELETE | `/api/knowledge-bases/:id` | Delete document + Supabase Storage file + pgvector embeddings |

### Flagged Queries API
| File | Method | Endpoint | What it does |
|------|--------|----------|-------------|
| `app/api/flagged-queries/route.ts` | GET | `/api/flagged-queries` | List flagged queries with status/agent filters |
| `app/api/flagged-queries/[id]/route.ts` | GET | `/api/flagged-queries/:id` | Get flagged query with full conversation thread |
| `app/api/flagged-queries/[id]/review/route.ts` | PATCH | `/api/flagged-queries/:id/review` | Verify or correct — requires agronomist response if correcting |

### HTTP Method Convention
- **GET** — read data (idempotent, no side effects)
- **POST** — create a new resource
- **PUT** — update multiple fields on a resource
- **PATCH** — update a single field or trigger a state transition
- **DELETE** — remove a resource

---

## Phase 2: Claude AI Chat Integration ✅ (Completed Feb 22)

### What was built
When a farmer sends a message, Claude generates a streaming response with confidence scoring, auto-flagging, usage tracking, and auto-title generation.

### New Files

#### `lib/claude.ts` — Anthropic SDK wrapper
- `buildSystemPrompt()` — assembles system prompt from agent config + response style + knowledge context (Phase 3)
- `chat()` — non-streaming call, returns full response + token counts
- `chatStream()` — streaming call, yields text chunks via async iterator, resolves token usage after stream completes
- `generateTitle()` — uses Haiku (cheap) to create a 5-word conversation title from the first message

#### `lib/confidence.ts` — Decoupled confidence scoring
- **Disabled by default** — set `ENABLE_CONFIDENCE_SCORING=true` in `.env` to activate
- `scoreConfidence()` — heuristic scoring (0-1): base 0.5, bonuses for knowledge context, conversation history, response length; penalties for hedging language
- `shouldFlag()` — compares score to agent's threshold, returns false if scoring is disabled
- **Designed to be swappable** — can replace heuristics with Claude self-assessment or eval-based scoring without touching any other file

#### `lib/cost.ts` — Token cost calculation
- `calculateCost(inputTokens, outputTokens, model)` — returns USD cost
- Pricing: Sonnet 4.5 ($3/$15 per 1M), Haiku 4.5 ($0.80/$4 per 1M)

### Modified File — `app/api/conversations/[id]/messages/route.ts`

POST flow (12 steps):
1. Save user message to DB
2. Load last 20 messages for conversation history
3. Check if this is the first message (for auto-title)
4. **Retrieve relevant knowledge chunks via RAG** (Voyage embedding → pgvector search)
5. Start Claude streaming response (with knowledge context injected into system prompt)
6. Stream text chunks to client via SSE
7. Get token usage after stream completes
8. Score confidence (if enabled, now uses RAG context info)
9. Save assistant message to DB (with sourcesCited from RAG)
10. Track API usage in `ApiUsage` table
11. Flag if confidence < agent's threshold (if scoring enabled)
12. Auto-generate title if conversation is untitled (Haiku call) — retries on subsequent messages if title generation failed

### SSE Stream Format
The POST endpoint returns `text/event-stream` with these event types:
```

### April 5 update — Secure farmer image support

Farmer chat now supports image attachments end-to-end with private storage and multimodal Claude input.

What changed:
- `MessageAttachment` gained `storagePath` in `prisma/schema.prisma`
- migration: `prisma/migrations/20260405195500_secure_chat_images/migration.sql`
- private image access route: `app/api/message-attachments/[id]/route.ts`
- chat image storage moved to a private `chat-images` bucket path
- client converts uploaded images to WebP before upload
- browser renders images via authenticated app URL, not direct public storage URL

Important implementation detail:
- Claude does **not** receive private attachment URLs
- the server reads private image bytes and sends image content to Claude as base64 blocks
- older image-only history turns that no longer have a usable image payload fall back to a tiny text block instead of producing an empty user message, because Anthropic rejects empty user turns
- the Mastra text-only path now normalizes blank history `content` to the same fallback string before calling `agent.stream(...)`, fixing the Anthropic `messages: text content blocks must be non-empty` error seen when a farmer sends plain text after older image-only turns

Files involved:
- `lib/supabase-storage.ts`
- `lib/claude.ts`
- `app/api/conversations/[id]/messages/route.ts`
- `app/api/message-attachments/[id]/route.ts`
- `app/chat/chat-client.tsx`
- `components/conversation-view.tsx`
data: { type: "user_message", message: {...} }     // User message saved to DB
data: { type: "text", content: "..." }              // Each Claude token as it generates
data: { type: "title", title: "..." }               // Auto-generated title (emitted whenever conversation has no title; typically first message, retries if generation failed)
data: { type: "done", message: {...}, usage: {...} } // Stream complete, final message + token usage
data: { type: "error", error: "..." }               // If something goes wrong mid-stream
```

### Error Recovery
If the stream fails mid-response, whatever Claude generated so far gets saved to the DB — no data loss.

### Title Generation Details
**Important:** Title generation is NOT tied to "first message only". The actual behavior is:
- **Logic:** Check `if (!conversation.title)` — if the conversation has no title, call `generateTitle()` with the user's message
- **Typical flow:** Triggered on the first message, generates title via Claude Haiku, SSE emits `{ type: "title", title: "..." }` event
- **Retry behavior:** If title generation fails on the first message (e.g., API error), the next message will retry. This ensures a title is eventually set.
- **Implementation:** `app/api/conversations/[id]/messages/route.ts:296-305`. **The code is the source of truth** — if this comment drifts from the code, update this comment.

---

## Phase 3: Knowledge Base & RAG Pipeline ✅ (Completed March 13, 2026)

### What was built
Full document upload → text extraction → chunking → embedding → vector storage → retrieval pipeline. When a farmer asks a question, relevant knowledge chunks are retrieved and injected into Claude's context.

### Success Metrics (Verified March 13, 2026)

- ✅ **164KB PDF uploaded successfully** (11 pages, 8,840 characters extracted)
- ✅ **6 chunks created in ~1ms** using simple fixed-size chunker
- ✅ **Memory usage clean:** 15MB → 29MB (no OOM crashes)
- ✅ **512-dimensional embeddings** stored in pgvector via Voyage 3.5-lite
- ✅ **Processing isolation:** Runs in child process (spawn + tsx), separate heap from Turbopack
- ✅ **Database verified:** 6 rows in `document_chunks` table with `embedding` column populated

### New Files

#### `lib/supabase-storage.ts` — File storage
- `uploadFile()` — uploads to Supabase Storage `knowledge-documents` bucket, path: `{orgId}/{kbId}/{fileName}`
- `deleteFile()` — removes file from storage (non-blocking, won't fail the request)
- `downloadFile()` — downloads for reprocessing
- `ensureBucket()` — auto-creates `knowledge-documents` bucket if missing (called before every upload). No manual Supabase dashboard step needed. Uses `public: true` + mime type restrictions.
- Uses service role key to bypass RLS

#### `lib/document-parser.ts` — Text extraction
- `extractText(buffer, fileType)` — single entry point for all file types
- PDF → `pdftotext` (poppler system binary) via `execFile` — runs in its own OS process, zero Node.js heap cost. Requires `brew install poppler` (Mac dev) or `poppler-utils` on Linux/Vercel.
- DOCX → `mammoth` (extractRawText)
- TXT → direct UTF-8 buffer decode
- **Why not pdf-parse or pdfjs-dist?** All JS PDF libraries (pdf-parse, pdfjs-dist, unpdf) cause Turbopack to consume 4-8GB of heap during module compilation in dev, crashing Node. pdftotext sidesteps this entirely.

#### `lib/chunker.ts` — Text splitting
- `chunkText(text, maxTokens?, overlapTokens?)` — recursive character splitting
- Default: 500 tokens/chunk, 100 token overlap
- Break hierarchy: paragraph breaks → sentence ends → word boundaries
- Returns `Chunk[]` with content, chunkIndex, tokenCount

#### `lib/embeddings.ts` — Voyage 3.5-lite API
- `embed(texts[])` — batch embed for document indexing (`input_type: "document"`)
- `embedQuery(text)` — single embed for search queries (`input_type: "query"`)
- 512-dimensional vectors, $0.02/1M tokens
- Raw fetch to `https://api.voyageai.com/v1/embeddings`

#### `lib/vector-db.ts` — pgvector operations
- `upsertEmbedding()` — store single chunk embedding
- `batchUpsertEmbeddings()` — batch store (50 at a time)
- `searchSimilar()` — cosine similarity search with `<=>` operator
- `deleteEmbeddings()` — uses `prisma.documentChunk.deleteMany()` (NOT raw SQL — Prisma uses camelCase column names, raw SQL would need quoting)
- Raw SQL only for vector insert/search (Prisma doesn't support vector type)

#### `lib/rag.ts` — RAG orchestrator
- `retrieveContext(query, agentId, topK)` — the main entry point
  1. Finds knowledge bases belonging to the agent
  2. Embeds the query via Voyage
  3. Searches pgvector for similar chunks
  4. Formats results as labeled context string for Claude
- Returns `RAGResult` with context string, chunks array, and hasContext flag

#### `app/api/knowledge-bases/upload/route.ts` — Upload endpoint
- POST `/api/knowledge-bases/upload` — accepts FormData (file, title, agentId)
- Validates: file type (PDF/DOCX/TXT), size (25MB max), agent ownership
- Creates DB record → uploads to Supabase Storage → returns 201 immediately
- Background `processDocument()`: extract → chunk → create DB records → embed → store in pgvector → update chunk count
- **⚠️ OOM issue in dev** — see Known Issues below

### Modified Files

#### `app/api/conversations/[id]/messages/route.ts`
- Added RAG retrieval step (step 4) before Claude streaming
- Passes `knowledgeContext` to `chatStream()` when chunks are found
- Confidence scoring now uses `rag.hasContext` and `rag.chunks.length`
- Assistant messages store `sourcesCited` (knowledge base IDs from RAG)

#### `app/api/knowledge-bases/[id]/route.ts`
- DELETE now cleans up: pgvector embeddings → Supabase Storage file → DB record (cascade)

### Database Changes
- Added `DocumentChunk` model to Prisma schema (id, content, chunkIndex, tokenCount, knowledgeBaseId)
- Added `embedding vector(512)` column via raw SQL
- Created ivfflat index on embedding column for fast cosine similarity search
- Enabled `pgvector` extension on Supabase PostgreSQL

### Known Issues — PDF Upload OOM ✅ FIXED (March 13, 2026)

**Root cause identified:** `lib/chunker.ts` had a catastrophic regex backtracking bug. The regex `/[.!?]\s[A-Z][^]*$/` tried to match "sentence break followed by everything until end of string," causing exponential memory consumption (6GB for 8KB text).

**Solution that worked:**

1. **Isolated child process:** Replaced in-process background function with `spawn("npx", ["tsx", "lib/workers/process-document-script.ts"])`. This gives document processing its own heap, completely separate from Turbopack's 4GB accumulation.
2. **Simple chunker:** Created `lib/chunker-simple.ts` with fixed-size chunking (no regex). Dead simple, works perfectly.
3. **pdftotext extraction:** Already using system binary via `execFile` — zero Node.js heap cost.

**Result:**

- 164KB PDF (11 pages, 8,840 characters) → 6 chunks → embeddings → pgvector
- Memory usage: 15MB → 29MB (clean, no crashes)
- Processing time: ~1ms for chunking, <5s total pipeline

**What we tried (that didn't work):**

- `serverExternalPackages: ["pdf-parse"]`, `["unpdf"]` — didn't help (OOM was runtime, not compile-time)
- worker_threads with resourceLimits — still crashed at 6GB
- Increasing heap with `NODE_OPTIONS=--max-old-space-size=6144` — delayed crash but didn't solve it
- Fixing chunker regex with matchAll and for loops — still crashed (other issues in chunker.ts)

**✅ MIGRATED TO MASTRA (March 13, 2026):** See "Mastra RAG Migration" section below for full details.

---

### Mastra RAG Migration ✅ (March 13, 2026)

After validating the custom RAG pipeline worked, we migrated to Mastra's official RAG utilities to leverage battle-tested code instead of maintaining custom implementations.

#### What Changed

**Replaced 5 custom files with single `lib/mastra-rag.ts`:**
- ❌ `lib/document-parser.ts` → ✅ `extractText()` using pdftotext + mammoth
- ❌ `lib/chunker.ts` → ✅ `chunkText()` using `@mastra/rag` MDocument
- ❌ `lib/chunker-simple.ts` (no longer needed)
- ❌ `lib/embeddings.ts` → ✅ `embedTexts()` + `embedQuery()` using `ai` SDK + `voyage-ai-provider`
- ❌ `lib/vector-db.ts` → ✅ `storeEmbeddings()` + `retrieveContext()` using raw Prisma SQL
- ❌ `lib/rag.ts` → ✅ Merged into `lib/mastra-rag.ts`

#### New Packages Installed

```json
"@mastra/rag": "^2.1.2",      // MDocument for parsing + chunking
"@mastra/core": "^1.12.0",    // Core framework (for future agent integration)
"@mastra/pg": "^1.8.0",       // Postgres integration (for future use)
"ai": "^6.0.116",             // Vercel AI SDK (embed/embedMany functions)
"voyage-ai-provider": "^3.0.0" // Voyage AI provider for AI SDK
```

#### Key Implementation Details

**Document Parsing & Chunking (`lib/mastra-rag.ts`):**
```typescript
// PDF extraction still uses pdftotext (Mastra doesn't have fromPDF)
const text = await extractText(buffer, "pdf"); // pdftotext via execFile

// Chunking uses Mastra's MDocument
const doc = MDocument.fromText(text);
const mastraChunks = await doc.chunk({
  strategy: "recursive",
  maxSize: 500,      // tokens per chunk
  overlap: 100,      // token overlap
});
// Returns array of Document objects with .text property
```

**Embeddings (Voyage 3.5-lite via AI SDK):**
```typescript
const result = await embedMany({
  model: voyage("voyage-3.5-lite"), // Uses default 1024 dimensions
  values: texts,
});
// Returns { embeddings: number[][] }
```

**Vector Storage (pgvector via raw Prisma SQL):**
- Uses `vector(1024)` column (migrated from 512 → 1024 for better quality)
- Batch insert via `prisma.documentChunk.createMany()` to avoid Session Pooler exhaustion
- Embeddings stored via raw SQL: `UPDATE document_chunks SET embedding = $1::vector`

#### Migration Fixes

**1. Connection Pool Exhaustion**
- **Problem:** `Promise.all()` creating 23 chunks simultaneously exhausted Supabase Session Pooler
- **Fix:** Use `createMany()` for single batch insert instead
- **Note:** In Vercel production with better resources, `Promise.all()` might be faster

**2. Vector Dimension Mismatch**
- **Problem:** Voyage default is 1024 dims, DB was configured for 512
- **Decision:** Migrate DB to 1024 for better quality (storage cost minimal for our use case)
- **Migration:**
  ```sql
  ALTER TABLE document_chunks DROP COLUMN embedding;
  ALTER TABLE document_chunks ADD COLUMN embedding vector(1024);
  CREATE INDEX document_chunks_embedding_idx ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```

#### Verified Results

- ✅ **164KB PDF → 23 chunks** (up from 6 with simple chunker — Mastra's recursive strategy is smarter)
- ✅ **1024-dim embeddings** stored in pgvector
- ✅ **Memory usage:** 214MB → 222MB during chunking (clean, no crashes)
- ✅ **Processing time:** ~1s total (extract + chunk + embed + store)

#### Files Modified

- `lib/mastra-rag.ts` — NEW, replaces 5 old files
- `lib/workers/process-document-script.ts` — Updated imports to use Mastra utilities
- `app/api/conversations/[id]/messages/route.ts` — Import `retrieveContext` from `lib/mastra-rag`
- `prisma/schema.prisma` — Comments updated to reflect `vector(1024)`

---

### Phase 3 Enhancements ✅ (March 31, 2026)

Three critical production fixes and features for RAG pipeline stability and intelligence.

#### 1. Production-Ready Chunking Fix

**Problem:** Mastra's chunker was throwing `"Created a chunk of size 513, which is longer than the specified 500"` errors. This caused uploads to create KB records in the database but with `chunkCount: 0` — total pipeline failure.

**Root Cause:** Hard maxSize limit (`maxSize: 500`) doesn't account for Mastra's recursive boundary detection. When semantic boundaries (paragraph breaks, sentence ends) don't align with token limits, chunker exceeds maxSize.

**Solution:** Removed the `maxSize` parameter entirely. Let Mastra's recursive strategy decide optimal chunk sizes naturally (400-800 tokens) while preserving `overlap: 100` for context continuity.

```typescript
// BEFORE (BROKEN):
const mastraChunks = await doc.chunk({
  strategy: "recursive",
  maxSize: 500,  // ❌ Causes "chunk exceeds limit" errors
  overlap: 100,
});

// AFTER (PRODUCTION-READY):
const mastraChunks = await doc.chunk({
  strategy: "recursive",
  // No maxSize - let Mastra decide optimal boundaries
  overlap: 100,
});
```

**Result:** Chunks vary naturally (400-800 tokens) based on semantic boundaries. No more runtime failures. Works for any document size.

**Files Modified:**
- `lib/mastra-rag.ts` (line 118) — removed maxSize, updated comments

#### 2. Multi-Agent KB Assignment

**Problem:** Knowledge bases had single `agentId` foreign key. Couldn't assign one document to multiple agents (e.g., "Pest Management Guide" used by both "General Farm Advisor" and "Pest Management Expert").

**Solution:** Changed to many-to-many relationship via `AgentKnowledgeBase` join table. First assigned agent is marked `isPrimary: true`.

**Schema Changes:**
```prisma
// NEW join table
model AgentKnowledgeBase {
  id              String   @id @default(cuid())
  agentId         String
  knowledgeBaseId String
  isPrimary       Boolean  @default(false)
  assignedAt      DateTime @default(now())

  agent         Agent         @relation(...)
  knowledgeBase KnowledgeBase @relation(...)

  @@unique([agentId, knowledgeBaseId])
}

// UPDATED relations
model KnowledgeBase {
  agents AgentKnowledgeBase[]  // was: agentId String
}

model Agent {
  knowledgeBases AgentKnowledgeBase[]  // was: knowledgeBases KnowledgeBase[]
}
```

**UI Impact:**
- KB list table shows primary agent name
- Side panel detail view shows: "**Primary:** Pest Expert • **Also assigned to:** Farm Advisor, Maize Expert"

**Files Modified:**
- `prisma/schema.prisma` — added join table, updated relations
- `app/api/knowledge-bases/upload/route.ts` — create join table entry instead of agentId
- `app/api/knowledge-bases/route.ts` — query via join table, return agents array
- `lib/hooks/use-knowledge-bases.ts` — updated KnowledgeDoc interface + normalize function
- `lib/mastra-rag.ts` `retrieveContext()` — query KBs via AgentKnowledgeBase join table

#### 3. Type-Aware RAG Retrieval (Weighted Scoring)

**Problem:** All knowledge bases treated equally during RAG search. Farmitecture-specific docs (CORE) should rank higher than generic ag guides (GENERAL), but both scored identically.

**Solution:** Implemented weighted scoring based on `kbType` enum:
- **CORE** (Farmitecture-specific) × 1.5
- **RELATED** (adjacent techniques like hydro/NFT) × 1.0
- **GENERAL** (broad ag knowledge) × 0.7

**How it works:**
1. Query vector store for `topK × 2` results (get more to re-rank)
2. Apply weight multiplier based on KB's `kbType`
3. Re-sort by weighted scores
4. Return top `topK` chunks

```typescript
// Get 2× results for re-ranking
const results = await vectorStore.query({
  indexName,
  queryVector,
  topK: topK * 2,  // e.g., 20 results
  filter: { knowledgeBaseId: { $in: kbIds } },
});

// Apply weights
const weighted = results.map((r) => {
  const kb = knowledgeBases.find((k: any) => k.id === kbId);
  const weight =
    kb?.kbType === "CORE" ? 1.5 : kb?.kbType === "RELATED" ? 1.0 : 0.7;
  return { ...r, score: r.score * weight };
});

// Re-sort and take top 10
weighted.sort((a, b) => b.score - a.score);
return weighted.slice(0, topK);
```

**Why this approach:**
- **Dynamic allocation:** Works for any KB mix (only CORE? Only GENERAL? All three? No problem.)
- **No empty slots:** If one category is missing, other categories fill the gap
- **Simple tuning:** Easy to adjust weights (e.g., CORE × 2.0 for even stronger priority)

**Alternative rejected:** Fixed slot allocation (6 CORE + 3 RELATED + 1 GENERAL) — too rigid, wastes slots when categories are missing.

**Files Modified:**
- `lib/mastra-rag.ts` `retrieveContext()` — implemented weighted scoring logic

#### Why These Changes Matter

**Chunking fix:** Prevents silent failures where KBs appear uploaded but have 0 chunks (unusable for RAG).

**Multi-agent assignment:** Enables knowledge reuse across agents without duplicating docs.

**Type-aware retrieval:** Ensures agents prioritize company-specific knowledge (CORE) over generic web content (GENERAL), improving answer quality and compliance.

#### 4. Testing & Debug Logging

**Console logging for weighted retrieval:**
Terminal output shows original similarity scores → weighted scores → final top 10 for debugging without exposing thinking to farmers.

```
🔍 RAG WEIGHTED RETRIEVAL:
Query embedding search returned 20 results (topK × 2 = 20)
  [1] Urban Cultivation in Accra.pdf (RELATED) - Original: 0.5517 → Weighted: 0.5517 (×1)
  [2] Insect-and-Hydroponic-Farming... (RELATED) - Original: 0.5329 → Weighted: 0.5329 (×1)

✅ Top 10 after weighted re-ranking:
  [1] Urban Cultivation in Accra.pdf (RELATED) - Score: 0.5517
  [2] Insect-and-Hydroponic-Farming... (RELATED) - Score: 0.5329
```

**Source diversity:** Naturally emerges when multiple documents match semantically. Future enhancement: max 3-4 chunks per KB constraint (noted, not implemented for v1).

**Files Modified:**
- `lib/mastra-rag.ts` — added console.log statements (lines 303-330)

#### 5. Duplicate Upload Prevention (April 1, 2026)

**Problem:** Agronomists could accidentally upload the same PDF twice, creating duplicate KB entries with different IDs but identical content.

**Solution:** Filename check (case-insensitive) before upload. Toast notification directs user to "Update Existing" flow instead.

```typescript
// Before upload
const duplicate = apiData.documents.find(
  (doc) => doc.fileName.toLowerCase() === uploadFile.name.toLowerCase()
);
if (duplicate) {
  notify.error(
    `A file named "${uploadFile.name}" already exists. Use "Update Existing" to replace it.`
  );
  return;
}
```

**Files Modified:**
- `app/dashboard/views/knowledge-view.tsx` — added duplicate check in `handleUploadSubmit()`

#### 6. Form Reset Fix (April 1, 2026)

**Problem:** When reopening KB upload modal, old field values (especially description) persisted, tricking users into thinking they'd already filled the form for a new upload.

**Solution:** Both `handleOpenUploadModal()` and `handleCloseUploadModal()` reset all categorization fields to defaults.

```typescript
// Reset on open AND close
setUploadKbType("RELATED");
setUploadContentType("");
setUploadSourceType("PDF_UPLOAD");
setUploadDescription("");
```

**Files Modified:**
- `app/dashboard/views/knowledge-view.tsx` — updated both modal handlers

---

## Phase 4: Dashboard Analytics ✅ (Completed Feb 23)

### What was built

Two API routes that power the agronomist dashboard overview page. No schema changes, no new libraries.

### New Files

#### `app/api/dashboard/stats/route.ts` — Dashboard stat cards

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | Returns activeAgents, knowledgeDocs, pendingFlags counts for the org |

- All three counts run in parallel via `Promise.all`
- Replaces the hardcoded `5`, `18`, `4` on the overview page (Phase 5)

#### `app/api/activity/route.ts` — Activity feed

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/activity?days=7&limit=20` | GET | Returns a merged, time-sorted activity feed from existing tables |

- No new DB table — queries flagged queries, conversations, agents, and knowledge bases
- Six activity types: `flagged_created`, `flagged_verified`, `flagged_corrected`, `conversation_started`, `agent_created`, `knowledge_uploaded`
- Each item: `{ type, description, agentName, metadata, timestamp }`
- Merges all results, sorts by timestamp (newest first), applies limit

---

## Phase 5: Connect UI to APIs

### Status
- ✅ **Agents View** — connected to `/api/agents` via SWR with pagination, search, CRUD actions, optimistic updates
- ✅ **Knowledge Base View** — connected to `/api/knowledge-bases`, upload wired to `/api/knowledge-bases/upload`, delete wired to `/api/knowledge-bases/:id`, demo mode working
- ✅ **Flagged Queries View** — fully connected with verify/correct/revoke/edit actions, audit logging, farmer + agronomist UIs complete (see below)
- ✅ **Chats View (Dashboard)** — SWR-connected via `useConversations`
- ✅ **Dashboard Overview** — stats cards + activity feed connected via `useDashboardStats` + `useActivity`

### Files introduced for Agents View
- `lib/hooks/use-agents.ts` — SWR hook wrapping `/api/agents`. Supports `search`, `page`, `limit`, `disabled` params.
  - When `disabled=true`, SWR key is `null` → zero fetch
- `app/dashboard/views/agents-view.tsx` — updated to accept `demoMode` prop and pass `demoMode` as `disabled` to the hook

### Demo Mode Integration Bug + Fix

**Root cause:** `DashboardClient` accepted `demoMode` from `demo/dashboard/page.tsx` but the interface didn't declare it → TypeScript silently ignored it → never passed it to child views → `AgentsView` always fetched from the API.

**Fix:** Added `demoMode?: boolean` to `DashboardProps` interface in `dashboard-client.tsx` and pass it down to each view.

### The Pattern — reuse for every view you connect

**Step 1: `dashboard-client.tsx`**
```tsx
interface DashboardProps {
  user: { name: string; email: string; role: string; };
  demoMode?: boolean;  // ← add this
}
export default function DashboardClient({ user, demoMode = false }: DashboardProps) {
  ...
  {activeNav === "agents" && <AgentsView ... demoMode={demoMode} />}  // ← pass it
}
```

**Step 2: `lib/hooks/use-xxx.ts`**
```ts
export function useMyHook(search?: string, page = 1, limit = 10, disabled = false) {
  const { data, error, isLoading, mutate } = useSWR(
    disabled ? null : `/api/my-endpoint?...`,  // null key = no fetch
    fetcher
  );
  return { items: data?.items || [], isLoading, isError: error, mutate };
}
```

**Step 3: `views/xxx-view.tsx`**
```tsx
export default function MyView({ sidebarOpen, setSidebarOpen, demoMode = false }) {
  const apiData = useMyHook(searchQuery, page, limit, demoMode);  // disabled in demo
  
  const items = demoMode ? mockItems.filter(/* client-side filter */) : apiData.items;
  const isLoading = demoMode ? false : apiData.isLoading;
  const mutate = demoMode ? () => {} : apiData.mutate;
}
```

**Mock data:** Keep a `const mockXxx = [...]` at the top of the view file. Use data that looks like a mature account (many items, variety of dates, realistic names). See git history (`caedbe1`) for the original rich mock datasets if needed.


---

## Phase 5b: Farmer Side API Integration ✅ (Completed March 11, 2026)

### FarmerSystem DB + API
- Added `FarmerSystem` model and `SystemStatus` enum to `prisma/schema.prisma`
- Ran `prisma db push` (not `migrate dev` — avoids pgvector migration reset issue)
- Created `/api/systems/route.ts` — GET farmer's systems, POST register system
- Created `lib/hooks/use-systems.ts` — SWR hook with `disabled` param for demo mode
- Status enum values are UPPERCASE: `ACTIVE`, `PENDING_SETUP`, `INACTIVE`
- After any `prisma generate`, dev server must be **fully restarted** (singleton caches old client)

### Farmer RBAC Fix
- `GET /api/agents` was blocking FARMER role — fixed to allow read-only access
- Farmers only see `isActive: true` agents (enforced server-side)
- `GET /api/conversations` farmers only see their own (enforced via `farmerId: user.id`)

### Chat Client Wiring
- `chat-client.tsx` now has full send flow: create conversation → POST message → read SSE stream
- `useAgents("", 1, 10, demoMode)` populates agent dropdown; first active agent auto-selected
- `handleSend()` creates a conversation on first message, reuses `currentConversationId` after
- SSE stream events handled: `text` (append), `done` (finalize message), `error` (show to user)
- **Data shape gotcha**: `POST /api/conversations` returns the conversation object directly via `apiSuccess(conversation)` — access as `data.id`, NOT `data.data.conversation.id`

### Stream Error Handling
- Server (`messages/route.ts`) detects billing errors and sends human-readable `{ type: "error" }` event
- Client handles `type === "error"` — displays error as an assistant bubble in the chat
- Billing-specific message: "The AI service is temporarily unavailable due to billing limits. Please contact support."
- Generic fallback: "Sorry, something went wrong. Please try again."

### Testing Notes
- Chrome DevTools responsive/device mode breaks client-side fetches (`ERR_INTERNET_DISCONNECTED`) — use Mac browser for API testing
- iPhone testing requires Mac's local IP (`http://192.168.X.X:3000`), NOT `localhost`
- Low Anthropic credits = stream opens then closes silently (dots appear then vanish); fix by topping up at console.anthropic.com

### Demo Mode (Chat)
- `demo/chat/page.tsx` passes `demoMode={true}` → `ChatPageClient` → child views
- `useAgents` / `useConversations` / `useSystems` all pass `disabled=true` in demo → zero API calls
- `handleSend` returns early if `demoMode=true`


---

## Phase 5c: Flagged Queries Review Workflow ✅ (Completed March 14, 2026)

### Feature: Complete Review & Audit System

Agronomists can verify, correct, edit, and revoke flagged query reviews with full audit logging. Farmers see corrections/verifications inline in their chat.

### What Was Built

#### Backend — Review API Endpoints
- **`PATCH /api/flagged-queries/:id/review`** — Verify or correct a flagged query
  - Accepts `status: "VERIFIED" | "CORRECTED"`, `agronomistResponse` (required for CORRECTED), `verificationNotes` (optional)
  - Allows editing if new status matches current status (e.g., editing an existing correction)
  - Otherwise only allows reviewing PENDING queries
- **`PATCH /api/flagged-queries/:id/revoke`** — Revoke a review (back to PENDING)
  - Creates `ReviewHistory` audit record before clearing review data
  - Prevents data loss — all review snapshots preserved in audit trail

#### Database — Audit Logging
- **`ReviewHistory` model** — tracks all review actions with snapshots
  - Fields: `action` (VERIFIED/CORRECTED/EDITED/REVOKED), `statusBefore`, `statusAfter`, `agronomistResponse`, `verificationNotes`, timestamps
  - Relations: `flaggedQuery`, `agronomist`
  - Cascade deletes with parent FlaggedQuery
- Schema in `prisma/schema.prisma` lines 198-230

#### Agronomist UI — Dashboard Flagged View
Location: `app/dashboard/views/flagged-view.tsx`

**Display order:**
1. Agent's Response (the flagged message)
2. **Why Farmer Flagged This** (shows all flag updates with timestamps) ← moved above review so agronomist sees context first
3. Your Review (verification notes or correction form)
4. Response Input (for PENDING status) or Edit/Revoke buttons (for reviewed status)

**Actions:**
- **Verify** — mark as correct with optional notes → green "Your Review" section
- **Correct** — provide corrected response (required) + optional notes → teal "Your Correction" section
- **Edit** — pencil icon on reviewed queries → reopens review form with current data
- **Revoke** — X icon on reviewed queries → clears review, creates audit record, back to PENDING

**UI Details:**
- Scroll-to link: "Click to see why farmer flagged this" jumps to flag reasons section
- Formatted timestamps: "Mar 13, 9:32 PM" instead of ISO strings
- Ordinals for multiple updates: "1st", "2nd", "3rd" with dates

#### Farmer UI — Chat Conversation View
Location: `components/conversation-view.tsx`

**Display order for flagged messages:**
1. Agent's Response (the message content)
2. Expert Correction (if CORRECTED) — green-bordered section with markdown rendering
3. Verified by Expert (if VERIFIED with notes) — green-bordered section with notes
4. **Why You Flagged This** (farmer's own flag reasons with navigation) ← shows after review
5. Message actions (copy, thumbs, flag, retry)

**Why You Flagged This section:**
- Shows farmer's flag reason + all updates (from `farmerReason` + `farmerUpdates` fields)
- Parsed from timestamped format: `[2026-03-13T21:32:09.573Z] message text`
- Formatted display: "1st • Mar 13, 9:32 PM • message text"
- **Navigation controls** (if multiple reasons):
  - Left/right chevron arrows to cycle through updates
  - Position indicator: "1/3", "2/3", etc.
  - Wraps around (last → first, first → last)
- Label changed to "Why **You** Flagged This" for farmer's perspective

### Key Patterns

**Edit flow** — allows agronomists to fix typos or improve responses without revoking:
- Review API checks: `if (existing.status !== "PENDING" && existing.status !== status)` → only allow if new status matches current
- Edit button reopens form with `agronomistResponse` and `verificationNotes` pre-filled
- Updates `reviewedAt` timestamp on save

**Revoke flow** — safe rollback with audit trail:
1. Create `ReviewHistory` record with snapshot of current review data
2. Clear `agronomistResponse`, `verificationNotes`, `reviewedAt` from `FlaggedQuery`
3. Set `status` back to `PENDING`
4. Farmer sees correction/verification disappear; agronomist sees it back in pending list

**Timestamp formatting** — consistent across both UIs:
```ts
timestamp.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true
})
// Output: "Mar 13, 9:32 PM"
```

### Files Modified
- `app/api/flagged-queries/[id]/review/route.ts` — edit support
- `app/api/flagged-queries/[id]/revoke/route.ts` — NEW revoke endpoint
- `prisma/schema.prisma` — ReviewHistory model + ReviewAction enum
- `app/dashboard/views/flagged-view.tsx` — reordered sections, edit/revoke UI
- `components/conversation-view.tsx` — farmer flag reasons navigation

### Testing Notes
- Safari caching can prevent seeing updates — test in Chrome or hard refresh
- Multiple flag updates tested: 1st, 2nd, 3rd reasons all display correctly with navigation
- Revoke creates audit record — verified in ReviewHistory table
- Edit preserves existing data — verified by editing verification notes

---

## Phase 5 Testing Checklist (in progress)

Before moving to Phase 6, verify the full pipeline end-to-end:

- [x] **Fix OOM crash** — ✅ FIXED (March 13, 2026). Child process isolation + simple chunker. 164KB PDF processes cleanly in 15MB → 29MB.
- [x] **Upload a PDF** — ✅ TESTED. 11-page FAQ PDF uploaded, extracted 8,840 characters via pdftotext, chunked into 6 pieces.
- [x] **Verify vectors stored** — ✅ VERIFIED. 6 rows in `document_chunks` table with `embedding` column populated (512-dimensional vectors).
- [x] **Verify chunkCount** — ✅ VERIFIED. `knowledge_bases.chunkCount` updated to 6 after processing.
- [ ] **Upload a TXT file** — bypasses PDF entirely, tests chunking + embedding pipeline (lower priority, PDF works)
- [ ] **RAG in chat** — send a question that should match KB content; verify Claude's response references it. Check `sources_cited` on saved assistant message.
- [ ] **Delete KB** — verify embeddings removed from `document_chunks` + file removed from Supabase Storage
- [ ] **Status polling** — KB card shows "Processing..." while `chunkCount = 0`, then "Ready" after. Currently no realtime update — user must refresh. Fine for now.

---

## Phase 6: RAG → Chat Integration (planned)

The RAG pipeline exists but isn't wired to chat yet. `lib/rag.ts` has `retrieveContext()` but `app/api/conversations/[id]/messages/route.ts` calls it only if there's a `knowledgeContext` argument — need to confirm this is actually plumbed in.

### 6.1 Verify RAG is wired
- Check `messages/route.ts` — does it call `retrieveContext(query, agentId)` before streaming?
- Check `lib/claude.ts` — does `chatStream()` accept and inject `knowledgeContext`?
- If not: wire it. The RAG result should be injected into the system prompt as a context block.

### 6.2 Agent configuration from dashboard
- Agronomist edits agent: systemPrompt, confidenceThreshold, responseStyle
- Currently the edit form in `agents-view.tsx` submits to `PATCH /api/agents/:id`
- Verify the API actually saves these fields (check `agents/[id]/route.ts` PATCH handler)
- Test: edit system prompt → chat → verify agent behavior changed

### 6.3 Confidence scoring + auto-flagging
- Already implemented server-side — agent responses below `confidenceThreshold` are auto-flagged
- Test: ask a question outside the knowledge base scope → verify it appears in flagged queries view
- Flagged queries view is connected (`flagged-view.tsx` + `/api/flagged-queries`)

### 6.4 (Optional) Knowledge base status realtime
- Currently KB cards don't update while processing — user has to refresh
- Option A: poll `/api/knowledge-bases` every 5s while any KB has `chunkCount = 0`
- Option B: Supabase Realtime subscription on `knowledge_bases` table
- Option A is simpler, fine for capstone demo

---

## Phase 6: Capstone Requirements Implementation (In Progress)

**Status:** 🚧 Phase 6.1 complete ✅, remaining phases pending
**Started:** March 14, 2026
**Deadline:** Early April 2026 (capstone draft submission)
**Estimated Effort:** 10-14 hours total (3 hours spent so far)

### Overview

Dr. Ebo's feedback requires these features to demonstrate the platform's value for Ghanaian agriculture and future scalability. See detailed implementation plan in `BACKEND-PLAN.md` Phase 6.

### Requirements Summary

1. **Weather API Integration** ☁️ — ✅ **COMPLETE** (March 14) — OpenWeatherMap as Mastra tool, smart tool calling
2. **Location API** 📍 — GPS detection + User schema update (location, gpsCoordinates)
3. **Ghana-Specific Knowledge Base** 🇬🇭 — Upload Ghana Ministry of Ag docs (demo data prep)
4. **Multi-Organization AaaS** 🏢 — Document existing architecture (already built!)
5. **Local Language Support** 🗣️ — Future work documentation (Twi, Fante, Pidgin)
6. **Demo Scenario** ✅ — Volta region tomato farmer test case for validation

---

### Phase 6.1: Weather API Integration ✅ (Completed March 14, 2026)

**What was built:**

1. **Weather Tool** — `lib/tools/weather.ts`
   - Mastra-compliant tool using `createTool()` pattern
   - OpenWeatherMap API integration (5-day forecast, current weather)
   - Input: location (city name or GPS coords)
   - Output: current weather + 5-day forecast (temp, humidity, precipitation, condition)
   - Smart description: "Call this when farmer asks about TIMING decisions: planting dates, harvest timing, pest management (humidity-related), irrigation scheduling. DON'T call for general crop info..."
   - Error handling: location validation, 404 fallback, graceful degradation

2. **Agent Builder** — `lib/agent-builder.ts`
   - Dynamic Mastra agent factory with configurable system prompt + tools
   - Combines: base system prompt + response style + knowledge context + tool usage guidance + user context
   - Injects user location/name into agent instructions
   - Constitutional AI guardrails (farming-only topics)
   - Returns `new Agent({ instructions, model, tools })`

3. **Mastra Streaming Integration** — `lib/claude.ts`
   - New `mastraStream()` function alongside existing `chatStream()`
   - Uses `agent.stream(messages)` with Mastra's streaming API
   - Returns `{ stream, getUsage }` matching existing interface
   - Logs tool calls for debugging (`onStepFinish` callback)

4. **API Route Update** — `app/api/conversations/[id]/messages/route.ts`
   - Switched from `chatStream` to `mastraStream`
   - Passes `userLocation` and `userName` to agent builder
   - TODO comment: location field to be added in Phase 6.2

5. **Documentation** — `TOOL-USAGE.md`
   - Comprehensive guide for creating smart tools for Cultivate agents
   - Explains how Claude automatically decides when to use tools
   - Proactive capability offers (3 patterns)
   - FAQ vs tool-worthy question scenarios
   - Cost optimization strategies
   - Implementation checklist

6. **Test Scripts**
   - `scripts/test-weather-api.ts` — Direct API test (working, verified with Accra)
   - `scripts/test-weather-tool.ts` — Mastra tool test (created but not yet tested)

**How it works:**

When a farmer sends a message like "I want to plant maize next week in Accra. Is it a good time?":
1. Message API calls `mastraStream()` with the query
2. `mastraStream()` calls `buildAgent()` to create a Mastra agent with weather tool access
3. Agent receives instructions including "Use getWeather() for planting timing..."
4. Claude reads the query and decides to call `getWeather("Accra")`
5. Tool fetches OpenWeatherMap data (25°C, 83% humidity, scattered clouds, 5-day forecast)
6. Claude synthesizes response: "Based on the forecast for Accra, heavy rains expected in 3 days. I recommend waiting until..."
7. Response streams back to farmer via SSE

**Smart tool calling:**
- "What is maize?" → No tool call (simple definition)
- "When should I plant maize?" → Calls getWeather (timing decision)
- "My tomato leaves are yellow" → No tool call (symptom diagnosis)
- "Should I harvest today?" → Calls getWeather (timing + rain check)
- "What's the weather today?" → Calls getWeather (direct weather question)

**Testing status:**
- ✅ Weather API verified working (Accra: 25°C, 83% humidity)
- ✅ Tool definition follows Mastra pattern
- ✅ Agent builder creates valid Mastra agent
- ✅ Mastra streaming wired to message API
- ⏸️ End-to-end chat test pending (requires running dev server + sending test query)

**Files changed:**
- Created: `lib/tools/weather.ts` (166 lines)
- Created: `lib/agent-builder.ts` (108 lines)
- Created: `TOOL-USAGE.md` (452 lines)
- Created: `scripts/test-weather-api.ts` (58 lines)
- Created: `scripts/test-weather-tool.ts` (45 lines)
- Modified: `lib/claude.ts` (+73 lines for `mastraStream()`)
- Modified: `app/api/conversations/[id]/messages/route.ts` (switched to Mastra)
- Updated: `CLAUDE.md`, `BACKEND-PLAN.md`, `BACKEND-PROGRESS.md` (this file)

**Key Insight (March 15, 2026):**
Weather tool works WITHOUT explicit user location field! Claude **extracts location from message text** ("I want to plant maize in Accra" → Claude calls `getWeather("Accra")`). Phase 6.2 would add persistent location storage so farmers don't need to mention it every time. **Strategic decision:** Save Phase 6.2 for more writeup content ("weather tool complete, just needs location schema for full functionality").

---

### Implementation Decisions (March 15, 2026)

**Context:** Capstone draft submission Monday, March 17, 2026 @ 11:59 PM

**Priorities for remaining time:**
1. ✅ **Voice Input** (Option A) - Supervisor request, mobile-friendly, 2-3 hrs
2. ⏭️ **Ghana Knowledge Base** (Option C) - Demo value, 1 hr
3. ⏸️ **Location Capture** (Phase 6.2) - Deferred (more writeup content)
4. ⏸️ **PWA Setup** - Deferred (time constraints)

**Bug fixes tabled:** See `FUTURE-BUG-FIXES.md` for post-submission fixes (duplicate messages on stream error, spacing after tool call).

**Future features documented:**
- Image upload for pest identification (visual diagnosis)
- Partial response handling with status field
- Local language support (Twi, Fante, Pidgin)

**Sources for Ghana KB:**
- [MOFA Maize Guide](https://mofa.gov.gh/site/images/pdf/production_guides/GUIDE_TO_MAIZE_PRODUCTION.pdf)
- [MOFA Tomato Guide](https://mofa.gov.gh/site/images/pdf/production_guides/TOMATO_Production_Guide.pdf)
- [MOFA Rice Guide](https://mofa.gov.gh/site/images/pdf/production_guides/RICE_Production_Guide.pdf)
- [Agriculture in Ghana Facts & Figures 2021](https://mofa.gov.gh/site/images/pdf/AGRICULTURE%20IN%20GHANA%20(Facts%20&%20Figures)%202021.pdf)

**Next:** Implementing voice input (Web Speech API integration) - March 15, 2026 afternoon.

---

### Phase 6.3: Voice Input Integration 🎤 ✅ (Completed March 15, 2026)

**What was built:**

1. **Speech Recognition Hook** — `lib/hooks/use-speech-recognition.ts`
   - Web Speech API wrapper with TypeScript declarations
   - Browser compatibility: Chrome/Edge (SpeechRecognition), Safari iOS (webkitSpeechRecognition)
   - Features: continuous mode, interim results, language selection
   - Error handling: permission denied, no speech, audio capture, network errors
   - Cleanup on unmount (prevents memory leaks)

2. **Mic Button Integration** — `components/conversation-view.tsx`
   - Mic button next to Plus button (left side of input)
   - Only shows in real mode (not demo) and if browser supports Web Speech API
   - Visual states:
     - Idle: Gray mic icon
     - Listening: Red mic icon + pulsing red dot
     - Disabled: Opacity 40% (during streaming)
   - Tooltip: "Voice input" / "Stop recording"

3. **User Experience Flow:**
   ```
   1. User taps mic button
   2. Browser requests mic permission (first time only)
   3. Recording starts → red mic icon + pulsing indicator
   4. User speaks their query
   5. Speech recognized in real-time
   6. When user stops speaking → final transcript auto-fills input
   7. User taps send button (or enters manually)
   ```

4. **Error Handling:**
   - Not supported: Button hidden automatically
   - Permission denied: Toast notification "Microphone permission denied..."
   - No speech detected: Toast "No speech detected. Please try again."
   - No microphone: Toast "No microphone found. Please check your device."
   - Network error: Toast "Network error. Please check your connection."

5. **Browser Support:**
   - ✅ Chrome/Edge Desktop (SpeechRecognition API)
   - ✅ Safari iOS 14.5+ (webkitSpeechRecognition)
   - ✅ Chrome Android (SpeechRecognition API)
   - ❌ Firefox (not supported as of 2026)

**Code changes:**
- Created: `lib/hooks/use-speech-recognition.ts` (220 lines)
- Modified: `components/conversation-view.tsx` (added mic button + speech state)
- Uses: `react-hot-toast` for error notifications

**Testing:**
- Desktop Chrome: Test Web Speech API availability
- Mobile testing required: iPhone Safari, Android Chrome
- Test scenarios:
  - Grant permission → successful recording
  - Deny permission → error toast
  - No speech → timeout handling
  - Background noise → accuracy check

**Next steps for testing:**
1. Test on real mobile devices (iPhone, Android)
2. Test in noisy environments (accuracy)
3. Test with different accents (Ghana English, local dialects)
4. Document any issues in FUTURE-BUG-FIXES.md

**Time spent:** 1.5 hours (faster than estimated! ⚡)

---

### Implementation Approach

**Leverage Mastra framework** (Section 2 of MASTRA-GUIDE.md):
- Weather as a tool: `createTool({ id: "getWeather", ... })`
- Dynamic agent with tools: `new Agent({ tools: { getWeather } })`
- Location injected into system prompt at runtime

**Key Files to Create:**
- `lib/tools/weather.ts` — OpenWeatherMap tool
- `lib/agent-builder.ts` — Mastra agent factory
- `lib/geocoding.ts` — Reverse geocoding helper
- `app/api/users/me/route.ts` — Profile update endpoint

**Schema Changes:**
```prisma
model User {
  // ... existing fields ...
  location       String?  // "Volta Region" or "Accra, Greater Accra"
  gpsCoordinates String?  // "6.1319,0.2710" for weather API
}
```

### Success Criteria

- [ ] Agent checks weather before planting advice
- [ ] Volta farmer gets different calendar than Northern farmer
- [ ] KB references Ghana-specific docs
- [ ] Architecture diagram shows multi-org isolation
- [ ] Local language support documented as future work

**Next step:** Start with weather tool implementation (2-3 hours), then location capture.

---

## Lessons Learned: Custom RAG vs Mastra (March 13, 2026)

### The Problem

We implemented Phase 3 (Knowledge Base & RAG) with custom utilities:

- `lib/document-parser.ts` — PDF/DOCX parsing with pdftotext + mammoth
- `lib/chunker.ts` — custom recursive chunker
- `lib/embeddings.ts` — direct Voyage API calls
- `lib/vector-db.ts` — raw Prisma SQL for pgvector
- `lib/rag.ts` — custom vector search + reranking

**Issue discovered:** `lib/chunker.ts` had a **catastrophic regex backtracking bug** (`/[.!?]\s[A-Z][^]*$/`) causing 6GB memory usage for an 8KB text document. The regex tried to match "sentence break followed by everything until end of string," forcing exponential backtracking.

**The win:** After fixing this (child process + simple chunker), the RAG pipeline now works perfectly end-to-end. 164KB PDF → 6 chunks → embeddings → pgvector storage, all in clean 15MB → 29MB memory usage. **This proves the architecture is sound.**

### Debugging Process

1. Added step-by-step memory logging in worker script (`process-document-script.ts`)
2. Created isolated test (`test-chunker.ts`) to test chunking separately from the full pipeline
3. Discovered OOM happened during chunking, not embedding
4. Created `lib/chunker-simple.ts` as temporary fixed-size fallback (works, but no smart break points)
5. **Checked MASTRA-GUIDE.md** — found Mastra provides the entire RAG pipeline built-in

### What Mastra Provides (Section 6 of MASTRA-GUIDE.md)

```typescript
// Document parsing
import { MDocument } from "@mastra/rag";
const doc = MDocument.fromPDF(buffer);

// Chunking
import { createDocumentChunker } from "@mastra/rag";
const chunker = createDocumentChunker({
  strategy: "recursive",  // paragraph → sentence → word
  size: 512,             // tokens per chunk
  overlap: 100,          // overlap between chunks
});
const chunks = await chunker.chunk(doc);

// Embeddings
import { voyageai } from "@mastra/voyageai";
const embedder = voyageai.embedding("voyage-3.5-lite");
const embeddings = await embedder.embedMany(texts);

// Vector storage
import { PgVector } from "@mastra/pg";
const vectorStore = new PgVector(process.env.DATABASE_URL);
await vectorStore.upsert({ indexName, vectors, metadata });

// Query
const results = await vectorStore.query({
  indexName,
  queryVector,
  topK: 10
});
```

### Migration Plan (Future Refactor)

**Current state:** Custom RAG pipeline works with simple chunker fallback. PDF upload processing runs in isolated child process (`spawn("npx", ["tsx", "script.ts"])`).

**Should migrate to:**

1. Replace `lib/document-parser.ts` → `MDocument.fromPDF()`
2. Replace `lib/chunker-simple.ts` → `createDocumentChunker()`
3. Replace `lib/embeddings.ts` → `voyageai.embedding()`
4. Replace `lib/vector-db.ts` → `PgVector` from `@mastra/pg`
5. Replace `lib/rag.ts` → Mastra's built-in query/rerank

**Benefits:**

- Battle-tested components (no regex bugs)
- Maintained by Mastra team
- Designed to work together
- Multiple chunking strategies built-in
- No reinventing the wheel

**Action:** Keep current implementation working for demo. Refactor to Mastra utilities in post-capstone cleanup.

### Key Takeaway

**Always check MASTRA-GUIDE.md before implementing agent/RAG/workflow features.** Mastra provides most building blocks built-in. Only write custom code when Mastra doesn't provide the functionality.

---

## Mastra RAG Migration ✅ (March 13, 2026)

### What Changed

After validating the custom RAG pipeline worked end-to-end, we migrated to Mastra's battle-tested utilities.

**Before (5 custom files):**

- `lib/document-parser.ts` — pdftotext + mammoth
- `lib/chunker.ts` — buggy custom recursive chunker
- `lib/chunker-simple.ts` — temporary fixed-size fallback
- `lib/embeddings.ts` — direct Voyage API calls
- `lib/vector-db.ts` — raw pgvector SQL
- `lib/rag.ts` — custom RAG search

**After (1 file using Mastra):**

- `lib/mastra-rag.ts` — replaces all 5 files above

### New Mastra Stack

**Packages installed:**

- `@mastra/rag@2.1.2` — MDocument, createDocumentChunker
- `@mastra/core@1.12.0` — core utilities
- `@mastra/pg@1.8.0` — PgVector integration
- `ai@6.0.116` — Vercel AI SDK for embeddings
- `voyage-ai-provider@3.0.0` — Voyage AI community provider

**Implementation:**

```typescript
// Document parsing
import { MDocument } from "@mastra/rag";
const doc = MDocument.fromPDF(buffer);
const text = doc.text;

// Chunking (recursive strategy)
import { createDocumentChunker } from "@mastra/rag";
const chunker = createDocumentChunker({
  strategy: "recursive",  // paragraph → sentence → word
  size: 500,             // tokens per chunk
  overlap: 100,          // overlap between chunks
});
const chunks = await chunker.chunk(doc);

// Embeddings (Voyage 3.5-lite)
import { embedMany, embed } from "ai";
import { voyageai } from "voyage-ai-provider";
const embeddings = await embedMany({
  model: voyageai.embedding("voyage-3.5-lite"),
  values: texts,
});

// Vector storage (still using raw SQL for our schema)
await prisma.$executeRaw`UPDATE document_chunks SET embedding = ...`;

// RAG search (cosine similarity)
const results = await prisma.$queryRaw`
  SELECT ...
  FROM document_chunks
  ORDER BY embedding <=> queryVector
  LIMIT 10
`;
```

### Files Updated

1. **`lib/mastra-rag.ts`** — created, single source for all RAG utilities
2. **`lib/workers/process-document-script.ts`** — imports from `mastra-rag.ts`
3. **`app/api/conversations/[id]/messages/route.ts`** — RAG retrieval uses Mastra

### Testing Status

- [ ] Upload PDF via Mastra → verify chunks created
- [ ] Query in chat → verify RAG context retrieval works
- [ ] Delete old custom RAG files after validation

### Benefits

- **Battle-tested components** — no more regex bugs
- **Maintained by Mastra team** — updates + security patches
- **Multiple chunking strategies** — can switch from recursive to token-aware if needed
- **Designed to work together** — MDocument → chunker → embedder
- **Cleaner codebase** — 5 files → 1 file


---

## URL State Persistence Pattern ✅ (Implemented April 2, 2026)

### Problem
Both `/chat` and `/dashboard` are single-page apps that track navigation state in React state only. Refreshing the page always reset to the default view, losing the user's position (open conversation, active dashboard tab, etc.).

### Solution
State is synced to the URL via `window.history.replaceState` on every change, and the server component reads `searchParams` on each request to restore it.

### URL Scheme

**Farmer chat (`/chat`):**
| URL | State |
|-----|-------|
| `/chat` | Welcome / new chat screen |
| `/chat?c=abc123` | Conversation `abc123` open |
| `/chat?view=chats` | Chats list view |
| `/chat?view=systems` | Systems view |
| `/chat?view=settings` | Settings view |

**Agronomist dashboard (`/dashboard`):**
| URL | State |
|-----|-------|
| `/dashboard` | Overview |
| `/dashboard?view=agents` | Agents list |
| `/dashboard?view=agent-edit&agent=abc123` | Edit agent `abc123` |
| `/dashboard?view=knowledge` | Knowledge bases |
| `/dashboard?view=flagged` | Flagged queries |
| `/dashboard?view=chats` | Chats review |
| `/dashboard?view=analytics` | Analytics |

### How It Works

**1. Server component reads `searchParams` and passes initial state as props:**

> ⚠️ **Next.js 15+/16:** `searchParams` is a Promise — must be awaited or it silently returns `undefined`, breaking URL restore. Fixed April 2, 2026.

```tsx
// app/chat/page.tsx
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ view?: string; c?: string }> }) {
  const params = await searchParams;
  const initialView = VALID_VIEWS.includes(params.view) ? params.view : "chat";
  const initialConversationId = params.c || null;
  return <ChatPageClient initialView={initialView} initialConversationId={initialConversationId} />;
}
```

**2. Client component initialises state from props:**
```tsx
const [activeView, setActiveView] = useState(initialView);
const [currentConversationId, setCurrentConversationId] = useState(initialConversationId);
```

**3. URL syncs on every state change (no navigation, no re-render):**
```tsx
useEffect(() => {
  if (demoMode) return;
  const params = new URLSearchParams();
  if (activeView === "chat" && currentConversationId) params.set("c", currentConversationId);
  else if (activeView !== "chat") params.set("view", activeView);
  window.history.replaceState(null, "", "/chat" + (params.toString() ? "?" + params : ""));
}, [activeView, currentConversationId, demoMode]);
```

**4. On mount, if a conversation ID was in the URL, restore it (parallel fetches):**
```tsx
useEffect(() => {
  if (!initialConversationId || demoMode) return;
  Promise.all([
    fetch(`/api/conversations/${initialConversationId}`).then(r => r.json()),
    fetch(`/api/conversations/${initialConversationId}/messages`).then(r => r.json()),
  ]).then(([conv, msgs]) => {
    setConversationTitle(conv.title);
    setMessages(msgs.messages.map(...));
  }).catch(() => {
    setCurrentConversationId(null);
    window.history.replaceState(null, "", "/chat");
  }).finally(() => setMessagesLoading(false));
}, []); // run once on mount
```

### Key Rules
- `window.history.replaceState` (not `router.push`) — updates URL without adding a history entry or re-rendering
- Demo mode is excluded — demo routes (`/demo/*`) never touch the URL
- Invalid URL params are silently ignored and fall back to defaults
- `replaceState` with the same URL is effectively a no-op

### Files Changed
- `app/chat/page.tsx` — reads `view` + `c` searchParams
- `app/chat/chat-client.tsx` — `initialView`, `initialConversationId` props; URL sync effect; restore effect
- `app/dashboard/page.tsx` — reads `view` + `agent` searchParams
- `app/dashboard/dashboard-client.tsx` — `initialView`, `initialAgentId` props; URL sync effect


---

## Frontend Refactor Log

### Component Barrel + Dropdown Rename (April 2026)

**What changed:**
- `components/custom-select.tsx` → renamed to `components/dropdown.tsx`. Component renamed `Dropdown`. Variant names unchanged (`pill`, `field`).
- `components/cultivate-ui.tsx` established as the **single import barrel** for all shared UI. All direct imports in app files migrated here.
- All 10+ consumer files updated to `import { ... } from "@/components/cultivate-ui"`.
- All hardcoded hex values in `dropdown.tsx` migrated to semantic Tailwind classes from `globals.css`.

**Files changed:** `components/dropdown.tsx`, `components/cultivate-ui.tsx`, `app/chat/chat-client.tsx`, `components/conversation-view.tsx`, all dashboard + chat views.

**Rule locked in:** import shared components only from `@/components/cultivate-ui`, never directly from their source files. Exception: `ConversationView` (too large to re-export cleanly — import directly).

---

### Accessibility Refactor — Radix UI Primitives (April 4, 2026)

**Branch:** `refactor/a11y-components` → merged to `main`

**Motivation:** DIY components (`Tooltip`, `Dropdown`) used `useState` + raw `div` — no keyboard navigation, no ARIA roles, no focus management. Failed WCAG 2.1 AA on keyboard and screen reader tests.

**What changed:**

#### `components/ui/tooltip.tsx` + `components/ui/select.tsx` (NEW)
Generated via `npx shadcn add tooltip select`. Radix UI primitives styled with Tailwind. These are the foundation; don't edit directly — they're re-used by the wrappers below.

#### `components/tooltip.tsx` — rewritten
Old: `useState(false)` toggled on `onMouseEnter`/`onMouseLeave`. No keyboard trigger, no ARIA.
New: wraps `TooltipPrimitive` from `components/ui/tooltip.tsx`. Same external API (`content` + `children`).

Gains:
- Tooltip appears on keyboard focus, not just hover
- `role="tooltip"` + `aria-describedby` auto-linked
- Portal rendering (no z-index conflicts)

#### `components/dropdown.tsx` — rewritten
Old: `useState(false)` + absolutely-positioned `div` backdrop.
New: wraps `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` from `components/ui/select.tsx`. Same external API (`value`, `onChange`, `options`, `variant`, `placeholder`).

Gains:
- Arrow keys, type-ahead search, Home/End
- `role="combobox"` on trigger, `role="listbox"` on panel, `role="option"` + `aria-selected` per item
- Focus returns to trigger on close
- Portal rendering

Cultivate dark theme applied to `SelectContent` (`bg-cultivate-bg-elevated`, `border-cultivate-border-element`, `rounded-xl`) and `SelectItem` (`focus:bg-cultivate-bg-hover`). Both `variant="pill"` and `variant="field"` preserved.

#### `app/layout.tsx`
Added `<TooltipProvider>` wrapping `{children}`. Required by Radix Tooltip — one provider at root, all tooltips inherit it.

#### `components/glass-circle-button.tsx`
Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`. Keyboard users now see a visible focus ring on the glass buttons.

#### `components/wave-icon.tsx` + `components/send-icons.tsx`
Added `aria-hidden="true"` to all SVG elements. Decorative — screen readers skip them.

**Zero caller changes.** All external APIs preserved. The barrel (`cultivate-ui.tsx`) re-exports `Tooltip` and `Dropdown` unchanged.

**Out of scope (next PR):** ~15 DIY modals using `fixed inset-0 bg-black/60` should be converted to `Dialog` from shadcn. See `UI-ACCESSIBILITY-REFACTOR.md` § "Out of scope".

---

### Pending Refactor Opportunities (identified April 4, 2026)

See `UI-REFACTOR-OPPORTUNITIES.md` for the full breakdown. Summary:

| Area | Issue | Impact |
|------|-------|--------|
| DIY modals | ~15 instances of `fixed inset-0 bg-black/60` across 7 files | No focus trap, no Escape, no `aria-modal` |
| Action menus (⋯) | DIY backdrop dismiss pattern in agents-view + knowledge-view | No keyboard nav |
| Hex colors | 274 hardcoded `bg-[#...]` / `text-[#...]` / `border-[#...]` in app/ | Breaks theming |
| Large files | `conversation-view.tsx` 1446 lines, `knowledge-view.tsx` 1416, `chat-client.tsx` 1342 | Hard to maintain |
| State sprawl | `knowledge-view.tsx` 30 useState, `flagged-view.tsx` 23 useState | Should use reducer or split |
| Direct imports | 4 files still importing `ConversationView` / `GlassCircleButton` directly | Minor inconsistency |


---

## PWA Offline Support (April 2026)

### Overview

Full offline capability for both farmer and agronomist sides. Two storage mechanisms:

| Layer | Managed by | What it caches |
|-------|-----------|----------------|
| Cache API | serwist service worker (`app/sw.ts`) | Static assets, app shell, page HTML |
| IndexedDB | `lib/offline-storage.ts` (via `idb`) | Structured data — conversations, messages, dashboard lists |

### Farmer Side

**Files:** `lib/offline-storage.ts`, `lib/hooks/use-online-status.ts`, `app/chat/chat-client.tsx`, `app/chat/views/chats-view.tsx`, `components/conversation-view.tsx`

**What works offline:**
- App shell loads instantly (serwist)
- Sidebar shows 20 most recently cached conversations
- ChatsView ("All Chats") shows cached list
- Opening a cached conversation loads its messages from IndexedDB
- URL-restore on mount (refresh) works offline via IndexedDB

**What's blocked offline:**
- Sending messages (input locked, WifiOff icon replaces send button, placeholder: "No connection · read only")
- Flagging, any mutation

**Write-through pattern:** Every time online data loads (conversations list, messages), it's written to IndexedDB automatically. On reconnect, `useOnlineStatus` triggers SWR revalidation → refreshes and re-caches.

### Agronomist Side

**Files:** `lib/offline-storage.ts` (v2 — added `agro_cache` store), `app/dashboard/dashboard-client.tsx`, `app/dashboard/views/agents-view.tsx`, `app/dashboard/views/knowledge-view.tsx`, `app/dashboard/views/flagged-view.tsx`, `app/dashboard/views/chats-view.tsx`

**What works offline:**
- Agents list — read-only
- Knowledge Bases list — read-only
- Flagged Queries list — read-only (with client-side search/filter)
- Dashboard stats — last-known numbers with "● Last updated Xm ago" label
- Activity feed — last-known list with "● Last updated Xm ago" label
- Chats list — cached farmer conversations; opening a chat loads messages from IndexedDB
- WifiOff icon shown in every view header and in the "Welcome, X" dashboard header

**What's blocked offline:**
- Create/edit/delete agent — button hidden
- Upload KB — button hidden
- Per-item action menus (rename, delete) — disabled (opacity-30)
- Verify/Correct flagged queries — disabled

**IndexedDB schema (v2):**
```
DB: cultivate-offline  (version 2)
Store: conversations    → farmer convos + messages (keyPath: "id")
Store: agro_cache       → agronomist data blobs (keyPath: "key")
  keys: "agents" | "knowledge_bases" | "flagged_queries" | "dashboard_stats"
        "activity" | "agro_conversations"
  shape: { key, data, cachedAt }
```

### Key Implementation Notes

- `reloadOnOnline: false` in `next.config.ts` — serwist's hard page reload disabled. `useOnlineStatus` revalidates SWR keys instead (smoother, no flash).
- `navigator.onLine` used for one-time checks inside mount effects; `useOnlineStatus()` used for reactive UI.
- All `saveAgroCache` / `saveConversationList` calls are fire-and-forget (`.catch(() => {})`) — non-critical, never blocks UI.
- DB version upgrade is additive: v1 creates `conversations`, v2 creates `agro_cache`. Existing users' v1 data is preserved.

### PWA Install Modal (April 2026)

Platform-aware install flow shared across farmer and agronomist UIs.

**Files:** `lib/hooks/use-pwa-install.ts`, `components/pwa-install-modal.tsx`

**`usePWAInstall` hook:**
- Detects platform at mount: `"ios"` | `"android"` | `"desktop"` | `"other"`
- Captures `beforeinstallprompt` event (Android/desktop Chrome) → `canNativeInstall: true`
- Tracks installed state via `display-mode: standalone` media query + `appinstalled` event
- Exposes `{ platform, isInstalled, canNativeInstall, triggerInstall() }`

**`PWAInstallModal` component:**
- iOS: 3-step Safari share flow with inline share icon SVG
- Android + native prompt: "Install" button triggers browser prompt + 3-step confirm
- Android + no prompt: manual "⋮ menu → Add to Home screen" steps
- Desktop + native prompt: "Install" button + 3-step confirm
- Desktop + no prompt: address bar install icon instructions
- Other: generic "Add to Home Screen" hint

**Download button behavior:**
- Hidden automatically when `isStandalone === true` (app already installed)
- Shown in sidebar only when sidebar is expanded (`sidebarOpen && !isStandalone`)

### Push Notifications (April 2026)

Web Push API for two events: agronomist notified when a query is flagged, farmer notified when their query is reviewed.

**Files:**
- `lib/push.ts` — `sendPushNotification(userId, payload)` — sends to all user subscriptions, auto-prunes 410/404 (stale) endpoints
- `lib/hooks/use-push-notifications.ts` — client hook: requests permission, subscribes with VAPID key, manages subscribe/unsubscribe state
- `app/api/push/subscribe/route.ts` — `POST` saves subscription, `DELETE` removes it
- `app/sw.ts` — `push` event listener (calls `showNotification`), `notificationclick` listener (focuses/opens window, navigates to deep-link URL)
- `app/chat/views/settings-view.tsx` — Notifications card: "Turn on/off" toggle, blocked state message
- `app/dashboard/views/settings-view.tsx` — same

**Trigger points:**
- `app/api/conversations/[id]/messages/route.ts` step 10 — after `flaggedQuery.create()`, fires `sendPushNotification(agronomistId, { title: "New flagged query", url: "/dashboard?view=flagged" })`
- `app/api/flagged-queries/[id]/review/route.ts` — after `flaggedQuery.update()`, fires `sendPushNotification(farmerId, { title: "Your question was reviewed", url: "/chat?chat=<conversationId>" })`

**DB:** `push_subscriptions` table created via raw SQL (migration history was out of sync). Columns: `id`, `user_id`, `endpoint` (UNIQUE), `p256dh`, `auth`, `created_at`.

**VAPID keys:** stored in `.env` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Generate new keys with `npx web-push generate-vapid-keys`.

---

### Modals → Radix Dialog + ⋯ Menus → DropdownMenu (April 5, 2026)

**What changed:**

Converted 12 DIY modals and 3 ⋯ context menus from manual `useState` + `fixed inset-0` backdrop to Radix UI primitives via shadcn.

**Modals converted → `Dialog` from `components/ui/dialog.tsx`:**
- `agent-edit-view.tsx` — KB selector
- `systems-view.tsx` — Add system
- `conversation-view.tsx` — Flag message
- `agents-view.tsx` — Create agent, Deactivate confirm, Delete confirm
- `flagged-view.tsx` — Verify, Edit correction, Revoke confirmation
- `knowledge-view.tsx` — Upload KB (multi-step), Delete doc confirm, Doc selector
- `chat-client.tsx` — Install PWA, Rename conversation, Delete conversation

**⋯ menus converted → `DropdownMenu` from `components/ui/dropdown-menu.tsx`:**
- `agents-view.tsx` — agent card menu (Edit, Activate/Deactivate, Delete)
- `knowledge-view.tsx` — document row menu (View, Download, Update, Delete)
- `chat-client.tsx` — sidebar chat item menu (Rename, Delete)

Offline `disabled={!isOnline}` state preserved on all DropdownMenu triggers.

**Left as-is (intentional):** Three dual-layout panels (`viewAgentModal`, `viewPanelDoc`, flagged chat slide-out) — desktop variant is a right-side panel incompatible with Dialog centering.

**Native `<select>` replaced:**
- `knowledge-view.tsx` "All Agents" filter → `Dropdown variant="pill"`
- `knowledge-view.tsx` upload modal agent selector → `Dropdown variant="field"`

**What's next:** Hex color cleanup (~274 hardcoded values → semantic Tailwind classes). See `UI-REFACTOR-OPPORTUNITIES.md § 3`.
