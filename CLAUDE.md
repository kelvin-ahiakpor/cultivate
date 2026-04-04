# Cultivate — CLAUDE.md

> Actionable rules and patterns for AI assistants. Implementation history → `BACKEND-PROGRESS.md`. Roadmap → `TODO.md`.

---

## ⚠️ CRITICAL: Always Check MASTRA-GUIDE.md First

Before implementing ANY agent, RAG, workflow, or memory feature — read `MASTRA-GUIDE.md`. Use Mastra's utilities instead of writing custom implementations. We lost hours debugging a custom chunker when `@mastra/rag` had battle-tested chunking built in.

---

## Project Overview

**Cultivate** is an Agent-as-a-Service (AaaS) platform for agricultural extension in Ghana.
- **Developer:** Kelvin Ahiakpor (Ashesi University CS Capstone, Spring 2026)
- **Supervisor:** Dr. David Ebo Adjepon-Yamoah
- **Partner:** Farmitecture (Accra-based urban farming startup, 70+ customers, 2 agronomists)
- **Problem:** Ghana has a 1:10,000 agronomist-to-farmer ratio. Cultivate uses AI to scale personalized agricultural advice.

### Two User Types
- **Agronomists** → `/dashboard` — train agents, upload knowledge bases, review flagged queries, monitor usage
- **Farmers** → `/chat` — chat with AI agents, get instant agricultural advice
- **Admins** → both routes

---

## Tech Stack (Locked In)

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | Next.js 16 App Router | TypeScript, Tailwind CSS, Turbopack |
| Database | Supabase PostgreSQL | Session Pooler connection |
| ORM | Prisma 7 + PrismaPg adapter | No `url` in schema.prisma — goes in prisma.config.ts |
| Auth | NextAuth.js v5 | JWT sessions, credentials provider, role-based |
| AI Agent Framework | **Mastra** | RAG, tools, memory, workflows |
| LLM | Claude Sonnet 4.5 | Via Anthropic SDK |
| Vector DB | **Supabase pgvector** | Managed by `@mastra/pg` PgVector |
| Embedding Model | **Voyage 3.5-lite** | $0.02/1M tokens, 1024 dims, 32K context |
| File Storage | Supabase Storage | Knowledge base documents (PDF, DOCX, TXT) |
| Data Fetching | **SWR** | Stale-while-revalidate, lightweight |
| Markdown Rendering | **react-markdown + remark-gfm** | Renders Claude responses in chat bubbles |
| Icons | Lucide React | |
| Deployment | PWA (mobile-first) | No app store needed |
| Streaming | **SSE (Server-Sent Events)** | Critical for good UX in LLM apps |
| Background Processing | **Child process (spawn + tsx)** | Document processing — isolated heap from Turbopack |

---

## Architecture Decisions

- **pgvector over Pinecone** — no new service, free, vector DBs are "mostly commoditized"
- **Voyage 3.5-lite over OpenAI** — same price, +6.34% quality, smaller vectors, Anthropic ecosystem
- **Mastra framework** — entire agent architecture built around it; RAG + tools + memory
- **Multi-tenant isolation** — Organization-based, vectorDbNamespace per org (`org_${organizationId}`)
- **Confidence scoring** — Claude self-assessment; flags below threshold for agronomist review
- **Database schema** — 10 tables live in Supabase. See `prisma/schema.prisma`. Key models: Organization, User, Agent, Conversation, Message, KnowledgeBase, AgentKnowledgeBase, FlaggedQuery, Feedback, ApiUsage, OrganizationQuota

---

## Current Status (April 2026)

All phases complete. See `BACKEND-PROGRESS.md` for full implementation details.

| Phase | Status | Summary |
|-------|--------|---------|
| Frontend UI | ✅ | Dashboard + chat + landing + auth |
| Phase 1: Core APIs | ✅ | CRUD for agents, conversations, messages, KBs, flagged queries |
| Phase 2: Claude chat | ✅ | SSE streaming, confidence scoring, auto-flagging, auto-titles |
| Phase 3: RAG | ✅ | Mastra RAG + pgvector migration complete (March 22) |
| Phase 4: Analytics | ✅ | Stats API + activity feed |
| Phase 5: UI → API | ✅ | All views connected; demo mode working; flagging; markdown rendering |
| Phase 6: Capstone | 🔄 | Weather tool, location, Ghana KB, translation (see TODO.md) |

### Phase 6 Quick Status
- ✅ **Voice input** — Web Speech API, Claude.ai-inspired UI (`lib/hooks/use-speech-recognition.ts`)
- ✅ **Local language** — Khaya API for Twi/Ewe; works for plain text; **markdown breaks translation** (25.6% truncation) — documented limitation
- ✅ **URL persistence** — Refresh restores exact view/conversation. See `BACKEND-PROGRESS.md § URL State Persistence`.
- ✅ **PWA offline — farmer side** — IndexedDB caches 20 most recent conversations + messages. Sidebar, ChatsView, and ConversationView all fall back to cache. Input locked with WifiOff indicator when disconnected. Reconnect triggers SWR revalidation (no hard reload). See `lib/offline-storage.ts`, `lib/hooks/use-online-status.ts`.
- 🔄 **Weather tool** — Test with "Should I plant maize today?" after location is set in settings
- 📝 **Ghana KB** — Upload Ghana agricultural doc, test RAG with regional queries
- 📝 **Location capture UI** — Schema has `location` + `gpsCoordinates` on User; needs UI
- 📝 **PWA offline — agronomist side** — Read-only fallback for flagged queries + agents list (planned)

---

## ⚠️ DO NOT OVERWRITE — Three View Modes

There are THREE distinct view modes. Every UI component must handle all three. **Never flatten them together.**

| Mode | Trigger | Key classes |
|------|---------|-------------|
| **Desktop** | `lg:` breakpoint (≥1024px) | `hidden lg:flex`, `lg:pt-3`, `lg:text-sm` |
| **Mobile web** | `< 1024px`, non-standalone | `lg:hidden`, `pt-16` for safe area |
| **Standalone (PWA)** | `display-mode: standalone` / iOS `navigator.standalone` | `standalone:` Tailwind variant, `isStandalone` JS state |

### Rules — read before editing any chat/dashboard UI

1. **`pt-16` on mobile** — conversation headers need `pt-16 lg:pt-3` for Dynamic Island safe area. Never reduce to just `pt-3`.
2. **Glass back button on mobile** — when a conversation is open, mobile shows: `[GlassCircleButton ←]` | `[title + system pill centered]` | `[+ circle button]`. The floating `PanelLeft` sidebar button is **hidden** when a conversation is open (`!currentConversationId` condition). Do NOT remove this pattern.
3. **Standalone input** — uses `relative z-30 -mt-10 bg-transparent pb-4` with gradient glass overlay (`bg-gradient-to-t from-[#1E1E1E]/70 via-[#1E1E1E]/40 to-transparent backdrop-blur-[0.5px]`). Desktop uses `bg-[#1E1E1E] pb-2` with `max-w-3xl mx-auto`. Do NOT merge these.
4. **Standalone bottom padding** — messages area uses `pb-12` standalone / `pb-6` desktop. Message gap is `space-y-2`. Input is INSIDE the scroll container (sticky bottom-0) so gradient overlaps messages correctly.
5. **Desktop breadcrumb header** — `hidden lg:flex` with `[system /] [title ▾]` inline-flex hover zones. This is DESKTOP ONLY.
6. **Demo = source of truth for UI** — when connecting real mode, copy demo UI exactly. Never invent a new simpler layout for real mode.
7. **`chats-view.tsx` (farmer)** — has the canonical mobile conversation list UI. The actual conversation view (header + messages + input) lives in `components/conversation-view.tsx` — the single source of truth used by BOTH real and demo mode. Edit conversation UI ONLY in that file.

---

## Design System

### 🎨 Semantic Color System

**IMPORTANT:** All colors use semantic Tailwind classes defined in `globals.css`. **NEVER hardcode hex values.**

✅ `className="text-cultivate-text-primary bg-cultivate-bg-main border-cultivate-border-element"`
❌ `className="text-[#C2C0B6] bg-[#1E1E1E] border-[#3B3B3B]"`

See `DESIGN-SYSTEM.md` for full reference.

### Colors (Dark Theme)
- Backgrounds: main `#1E1E1E`, sidebar `#1C1C1C`, elevated `#2B2B2B`, hover `#141413`
- Text: primary `#C2C0B6`, secondary `#9C9A92`, tertiary `#6B6B6B`
- Brand: green-light `#85b878`, green-dark `#536d3d`, teal `#608e96`, beige `#e8c8ab`
- Borders: subtle `#2B2B2B`, element `#3B3B3B`
- Primary buttons: `#5a7048` normal, `#4a5d38` hover

### Typography
- Playfair Display (serif headings), Rubik (body)

### UI Patterns
- **Hover philosophy**: always darken, never lighten. Hover color is `#141413`, NOT `#363636`.
- **Sidebar**: w-72 expanded, w-14 collapsed, 300ms transition
- **Active nav**: `bg-[#141413]` (same as hover)
- **Scrolling layout**: flex col + overflow-hidden, `flex-shrink-0` header, `flex-1 min-h-0 overflow-y-auto` body
- **Thin scrollbar**: 4px, transparent track, `#3B3B3B` thumb
- **Disabled controls**: Use `disabled:opacity-40` for visual feedback, but **NEVER** `disabled:cursor-not-allowed`. Keep pointer cursor on all disabled elements.
- **Filter pills — two styles in use**:
  - **Green active** (dashboard/agents): active = `bg-[#5a7048] text-white`, inactive = `bg-[#2B2B2B] text-[#C2C0B6] hover:bg-[#3B3B3B]`
  - **Grey active** (Claude.ai style): active = `bg-[#3B3B3B] text-[#C2C0B6]`, inactive = `text-[#9C9A92] hover:text-[#C2C0B6] hover:bg-[#2B2B2B]`
- **Dropdown**: `import { Dropdown } from "@/components/cultivate-ui"`. `variant="pill"` (compact sort bar) or `variant="field"` (full-width form field). Source: `components/dropdown.tsx`.
- **Toasts**: always use `notify.success()` / `notify.error()` from `lib/toast.ts`. Never inline `toast.success/error` with style objects.
- **Date inputs**: use `[color-scheme:dark]` Tailwind class on `<input type="date">` for dark calendar icon.
- **List item hover pattern**: Keep dividers as separate sibling elements from hover divs. If `border-b` is on the same element as `rounded-lg`, corners round too.
  ```tsx
  <div key={id} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
    <div className="rounded-lg hover:bg-[#141413]">content</div>
    <div className={`border-b border-[#3B3B3B] transition-opacity ${
      hoveredIndex === i || hoveredIndex === i + 1 ? "opacity-0" : "opacity-100"
    }`} />
  </div>
  ```
- Server component wrapper (page.tsx) + client component (*-client.tsx)
- `has-[button:hover]:bg-transparent` pattern for separate hover zones

### Strict Rules (DO NOT CHANGE)
- Conversation header padding: `pt-3 pb-3 pl-4 pr-3` (12 12 16 12)
- Sidebar Cultivate header: `p-2` (8px) with `min-h-[53px]` for alignment

---

## File Locations

### Pages & Views
- Chat UI: `app/chat/chat-client.tsx`
- Dashboard: `app/dashboard/dashboard-client.tsx`
- Dashboard views: `app/dashboard/views/{agents,knowledge,flagged,chats,agent-edit}-view.tsx`
- Chat views: `app/chat/views/{chats,systems}-view.tsx`

### Infrastructure
- Prisma client singleton: `lib/prisma.ts`
- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Auth config: `auth.ts` (NextAuth v5)
- Middleware: `middleware.ts` (route protection)
- **Toast helper:** `lib/toast.ts` — `notify.success()` / `notify.error()`
- **RAG pipeline:** `lib/mastra-rag.ts` — parsing, chunking, embeddings, vector storage (all via Mastra)
- **PWA offline storage:** `lib/offline-storage.ts` — IndexedDB helpers (via `idb`). `saveConversationList()`, `saveConversationMessages()`, `getConversationList()`, `getConversationMessages()`. Max 20 conversations cached.
- **Online status hook:** `lib/hooks/use-online-status.ts` — `useOnlineStatus()`. Returns `boolean`, listens to `window` online/offline events, revalidates all SWR keys on reconnect. Use this instead of `navigator.onLine` for reactive UI.

### Components
- **Barrel (import from here):** `components/cultivate-ui.tsx` — single import point for all shared components. `import { Dropdown, Tooltip, GlassCircleButton, WaveIcon, AnimatedDots, CabbageIcon, PaperPlaneIcon, SproutIcon } from "@/components/cultivate-ui"`.
- **Conversation UI (single source of truth):** `components/conversation-view.tsx` — header, messages, input for ALL chat views. Edit conversation UI here ONLY.
- Individual component sources (don't import directly — use the barrel above):
  - `components/dropdown.tsx` — `Dropdown`, `variant="pill"|"field"`
  - `components/tooltip.tsx` — `Tooltip`
  - `components/glass-circle-button.tsx` — `GlassCircleButton`
  - `components/wave-icon.tsx` — `WaveIcon`, `AnimatedDots`
  - `components/send-icons.tsx` — `CabbageIcon`, `PaperPlaneIcon`, `SproutIcon`, `SEND_ICONS`
- Shadcn primitives: `components/ui/` (also re-exported from cultivate-ui.tsx)

### Documentation (reference, don't delete)
- `BACKEND-PLAN.md` — API route specs, implementation phases
- `BACKEND-PROGRESS.md` — full implementation history, URL persistence pattern, RAG migration details
- `TODO.md` — full roadmap with checkboxes
- `DESIGN-SYSTEM.md` — design tokens and patterns
- `SCROLLING-LAYOUT.md` — scrolling layout pattern guide
- `MASTRA-GUIDE.md` — Mastra framework reference (check before implementing RAG/agents)

### Advanced Topics
- **`KB-CATEGORIZATION.md`** — Three-tier KB system (CORE/RELATED/GENERAL), type-aware RAG retrieval
- **`AGENT-BEHAVIOR.md`** — conversational patterns, weather tool, testing recommendations

---

## Demo Routes

- `/demo/dashboard` — agronomist dashboard with full mock data
- `/demo/chat` — farmer chat with full mock conversations
- Demo routes bypass auth, share the same client components, **never make API requests**
- **Mock data:** ALL mock data in `lib/demo-data.ts` — `DEMO_AGENTS`, `DEMO_KNOWLEDGE`, `DEMO_FLAGGED`, `DEMO_DASHBOARD_CHATS`, `DEMO_FARMER_CHATS`, etc. Never inline mock data in views.

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Agronomist | agronomist@farmitecture.com | password123 |
| Farmer | farmer@farmitecture.com | password123 |
| Admin | admin@cultivate.com | password123 |

---

## Demo Mode Integration Pattern

**The fix chain — 3 files per view:**
1. **`dashboard-client.tsx`** — add `demoMode?: boolean` to interface, pass down to view
2. **`views/xxx-view.tsx`** — accept `demoMode` prop; switch between mock data and API data
3. **`lib/hooks/use-xxx.ts`** — add `disabled` param; when `true` pass `null` as SWR key → zero requests

```ts
// Hook pattern:
export function useMyHook(params, disabled = false) {
  const { data } = useSWR(disabled ? null : `/api/endpoint?...`, fetcher);
}
```

```tsx
// View pattern:
const apiData = useMyHook(params, demoMode);
const items = demoMode ? mockItems : apiData.items;
const isLoading = demoMode ? false : apiData.isLoading;
const mutate = demoMode ? () => {} : apiData.mutate;
```

### Shared Component Pattern

When a view has a detail panel, extract it into `components/` rather than duplicating across real + demo views. Example: `components/conversation-view.tsx` used by both `chat-client.tsx` and `chats-view.tsx`. The component accepts data + callbacks as props only — no internal API fetches.

---

## Gotchas & Lessons Learned

### Testing Setup — CRITICAL
- **NOT a real PWA** — testing is done via a **pinned-to-home-screen Safari tab** (Add to Home Screen)
- **NEVER run `rm -rf .next`** — wipes Turbopack's incremental cache, causes corruption errors
- `standalone:` classes work because Safari reports `display-mode: standalone` for pinned tabs
- **Mac Chrome DevTools device mode** — broken for API requests (`ERR_INTERNET_DISCONNECTED`). Use for CSS only.
- **iPhone Safari** — use local IP `http://192.168.X.X:3000`, not `localhost`

### PWA Offline Patterns (April 2026)
- **Two storage layers:** Cache API (serwist/sw) handles static assets; IndexedDB (`lib/offline-storage.ts`) handles structured data (conversations + messages).
- **`reloadOnOnline: false`** in `next.config.ts` — serwist's hard page reload is disabled. `useOnlineStatus` handles reconnect via SWR revalidation instead, which is smoother.
- **Write-through:** Conversations and messages are written to IndexedDB every time they load from the API. No explicit "sync" step.
- **Offline flow:** `useOnlineStatus()` → `isOnline = false` → component reads from IndexedDB → shows stale data with WifiOff indicator. On reconnect → SWR revalidates → IndexedDB updated.
- **No offline writes** — sending messages, flagging, and any mutation require a real connection. Input is locked (`readOnly`, WifiOff indicator replaces send button) when offline.
- **`navigator.onLine` vs `useOnlineStatus`** — use the hook for reactive UI; use `navigator.onLine` directly for one-time checks inside effects/async functions (e.g. mount effects where you don't want to re-run on status change).

### Anthropic API Credits
- Zero balance → stream opens then closes silently (dots appear then vanish)
- Server logs: `400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low..."}}`

### Next.js 16 — `searchParams` is a Promise ⚠️
- **`searchParams` must be awaited** — accessing synchronously returns `undefined`, silently breaking URL restore
- **Correct:**
  ```tsx
  export default async function MyPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    const params = await searchParams;
    const view = params.view;
  }
  ```
- Root cause of dashboard + chat URL persistence not working on refresh. Fixed April 2, 2026 in `app/dashboard/page.tsx` and `app/chat/page.tsx`.

### Prisma 7
- No `url` in schema.prisma — it goes in `prisma.config.ts`
- PrismaClient needs PrismaPg adapter from `@prisma/adapter-pg`
- Always use the singleton in `lib/prisma.ts` (hot reload creates multiple instances)
- `dotenv/config` import at top of `prisma.config.ts` loads .env before config runs

### Database Connection Pooling

| Environment | Port | Type | `max` connections |
|-------------|------|------|-------------------|
| Local dev | `5432` | Session Pooler | `3` |
| Vercel (prod) | `6543` | Transaction Pooler | `1` |

- Session Pooler: connection persists for process lifetime. Fine for dev server.
- Transaction Pooler: returned to pool after each query. Required for Vercel serverless.
- `max: 1` on Vercel: one request per function invocation. More = connection explosion.
- Both `Pool` and `PrismaClient` cached in `globalThis` to prevent hot-reload connection leaks.
- `?pgbouncer=true` does nothing with PrismaPg adapter — drop it from the URL.

### Prisma Schema Migrations — ⚠️ CRITICAL
**NEVER use `prisma db push` when you have data in the database.**

- `db push` drops columns immediately — data loss is instant and unrecoverable
- Incident (March 31): `db push` dropped `agentId` from 3 existing KBs → lost all agent assignments

**ALWAYS use `prisma migrate dev`:**
```bash
npx prisma migrate dev --name descriptive-migration-name
```

Only use `db push` for: empty databases, throwaway prototyping, local-only testing.

### Known Gotchas
- **`crypto.randomUUID` on iOS Safari < 15.4** — not supported. Use `genId()` helper in `chat-client.tsx`.
- **Supabase Storage bucket** — `lib/supabase-storage.ts` calls `ensureBucket()` auto-creates `knowledge-documents` if missing.
- **PDF processing** — runs in isolated child process (`lib/workers/process-document-script.ts`) to prevent Turbopack OOM. Uses Mastra RAG: `MDocument.fromPDF()` + `createDocumentChunker()` + voyage embeddings.
- **Mastra PgVector upsert** — expects three separate arrays (`vectors`, `ids`, `metadata`), NOT objects. AI SDK returns typed arrays — convert with `Array.from()`. PgVector requires explicit `id` param in config.
- **KB chunking** — no `maxSize` limit on Mastra's recursive chunker (removing it fixed "chunk size exceeds limit" errors that caused 0 chunks stored).
- **Single-agent API shape** — `GET /api/agents/[id]` returns `knowledgeBases` as a relation array and counts under `_count`. The `useAgent` hook normalizes this to match the `Agent` interface (count as number). The list API returns `_count` nested — `agent.conversations` etc. show as 0 until properly mapped.

### Path & Environment
- Project path has spaces: `/Users/kelvin/Documents/ASHESI/4TH YEAR/Capstone/cultivate`
- Always quote paths in shell commands

### UI
- Send icon cycling: use simple string state, not array indexing
- Always re-read files before editing (content may have changed)

---

## Kelvin's Preferences

- Direct, focused responses — no unnecessary elaboration
- Efficiency matters — don't repeat what's already decided
- Explain the "why" briefly when making technical choices
- Comfortable with code but learning as he goes — clear variable names help
- Desktop-first for agronomists, mobile-first for farmers
