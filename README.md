# Cultivate — AaaS Platform for Agricultural Extension

> **Agent-as-a-Service (AaaS) platform** that lets agronomists train configurable AI agents to scale agricultural extension services in Ghana.

**Project:** CS Applied Capstone at Ashesi University  
**Developer:** Kelvin Ahiakpor  
**Supervisor:** Dr. David Ebo Adjepon-Yamoah  
**Partner:** Farmitecture (Accra-based urban farming startup)

---

## 🌱 Project Overview

Cultivate addresses the **1:10,000 agronomist-to-farmer ratio** problem in Ghana by enabling agronomists to create AI agents that provide on-demand agricultural advice to farmers via chat. Think of it as "ChatGPT for farming" where agronomists control the knowledge base and quality.

### Two User Types

- **Agronomists** — Train agents, upload knowledge bases (PDFs/docs), review flagged queries, monitor usage
- **Farmers** — Chat with AI agents, get instant agricultural advice, rate responses

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase)
- `.env` file configured

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Seed test data
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Test Accounts:**
- Agronomist: `agronomist@farmitecture.com` / `password123`
- Farmer: `farmer@farmitecture.com` / `password123`

For detailed setup instructions, see [SETUP.md](./SETUP.md).

---

## 📦 Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Framework | Next.js 14 App Router | SSR, API routes, TypeScript |
| Database | Supabase PostgreSQL | Managed, Session Pooler |
| ORM | Prisma 7 + PrismaPg | Type-safe DB access |
| Auth | NextAuth.js v5 | Email/password, role-based |
| Styling | Tailwind CSS | Rapid prototyping |
| UI Components | Radix UI + shadcn/ui | Accessible, customizable |
| Icons | Lucide React | Consistent icon system |
| LLM | Claude Sonnet 4.5 | Via Anthropic SDK |
| AI Framework | Mastra | RAG pipeline (TBD) |
| Vector DB | TBD (Pinecone/Weaviate) | Multi-tenant namespacing |
| Deployment | PWA (mobile-first) | No app store needed |

---

## 🎨 Current Implementation Status

### ✅ Completed

#### Core Infrastructure
- [x] Next.js 14 project with TypeScript
- [x] Prisma 7 schema with 10 tables (migrated to Supabase)
- [x] Database connection working (Session Pooler)
- [x] Environment configuration

#### Authentication System
- [x] NextAuth.js v5 integration
- [x] Email/password credentials provider
- [x] Role-based access (Agronomist, Farmer, Admin)
- [x] Session management in database
- [x] Protected routes with middleware
- [x] Sign up / Login / Logout flows
- [x] Test account seeding

#### Landing Page & Marketing
- [x] Hero section with value proposition
- [x] Feature cards (Upload, Train, Monitor, Scale)
- [x] How it works section (3-step process)
- [x] Partner showcase (Farmitecture)
- [x] Call-to-action sections
- [x] Desktop-first responsive design

#### Agronomist Dashboard (Full UI)
- [x] Dashboard layout with sidebar navigation
- [x] **Overview page** with metrics cards, charts, recent activity feed
- [x] **Knowledge Base view** with:
  - Document list with agent assignment, status, chunks count
  - Upload modal with new/update workflow
  - Document selector modal with search (for updates)
  - View document side panel (metadata, preview, download)
  - Delete confirmation modal (shows chat usage count)
  - Agent filter and search functionality
  - Pagination (30 items per page)
- [x] **Agents view** with:
  - Agent cards showing status, conversations, flagged queries
  - Create agent modal (name, prompt, response style, confidence threshold)
  - Edit agent modal (full configuration)
  - Deactivate agent modal (with impact explanation)
  - Strict delete modal (requires reason + exact name match)
  - Live slider for confidence threshold (0.00-1.00)
  - Mock data (7 agents, various configurations)
- [x] **Flagged Queries view** with:
  - Query cards with confidence scores
  - Approve/reject workflow
  - Human response override
  - Confidence threshold indicators
- [x] **Activity Panel** (slide-out right panel)
  - Recent activity timeline
  - User actions, timestamps
  - Properly functional close button
- [x] **Scrolling Layout Pattern**
  - Fixed header + scrollable content pattern
  - Custom 6px flush scrollbars across all views
  - Consistent content spacing (mr-2 headers, mr-3 content)
  - Documented in [SCROLLING-LAYOUT.md](./SCROLLING-LAYOUT.md)
- [x] **Color System**
  - Organic green theme (#5a7048 primary, #4a5d38 hover)
  - Consistent button colors across all modals
  - Dark mode optimized (#1E1E1E, #1C1C1C, #2B2B2B)
  - Slider with live value updates and gradient fill
  - Slider hover brightness effect

#### Farmer Chat Interface (Initial UI)
- [x] Chat layout with agent selector dropdown
- [x] Message list area
- [x] Message input with send button
- [x] Agent-specific UI indicators

### 🚧 In Progress / Next Steps

See [TODO.md](./TODO.md) for detailed priorities.

---

## 🏗️ Project Structure

```
cultivate/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth.js endpoints
│   │   └── organizations/        # Organization API
│   ├── chat/                     # Farmer chat interface
│   ├── dashboard/                # Agronomist dashboard
│   │   ├── views/                # Dashboard view components
│   │   │   ├── agents-view.tsx   # Agent management
│   │   │   ├── flagged-view.tsx  # Flagged queries
│   │   │   └── knowledge-view.tsx # Knowledge base
│   │   └── dashboard-client.tsx  # Main dashboard container
│   ├── landing/                  # Marketing landing page
│   ├── login/                    # Login page
│   ├── signup/                   # Sign up page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   └── cultivate-ui.tsx          # Custom UI components
├── lib/                          # Utilities
│   ├── prisma.ts                 # Prisma client singleton
│   └── utils.ts                  # Helper functions
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Migration history
│   └── seed.ts                   # Test data seeder
├── public/                       # Static assets
├── types/                        # TypeScript types
├── .env                          # Environment variables (not in git)
├── prisma.config.ts              # Prisma 7 configuration
├── next.config.ts                # Next.js configuration
└── README.md                     # This file
```

---

## 📐 Design System

### Color Palette

```css
/* Primary (Organic Green) */
--primary: #5a7048;
--primary-hover: #4a5d38;
--primary-border: #85b878;

/* Backgrounds */
--bg-primary: #1E1E1E;
--bg-secondary: #1C1C1C;
--bg-tertiary: #2B2B2B;
--bg-elevated: #3B3B3B;

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #C2C0B6;
--text-muted: #9C9A92;
--text-disabled: #6B6B6B;

/* Status Colors */
--status-active: #85b878;
--status-inactive: #6B6B6B;
--status-warning: #F59E0B;
--status-error: #EF4444;
```

### Typography

- **Headings:** System serif stack (Georgia, Times New Roman)
- **Body:** System sans-serif stack (SF Pro, Segoe UI, Arial)
- **Code:** Monospace stack (Fira Code, Consolas)

### Scrollbar Styling

- **Width:** 6px
- **Thumb:** #3B3B3B
- **Track:** Transparent
- **Alignment:** Flush (scrollbar-outset: 0px)
- **Content Spacing:** mr-2 (headers), mr-3 (content)

See [SCROLLING-LAYOUT.md](./SCROLLING-LAYOUT.md) for implementation guide.

---

## 🗄️ Database Schema (10 Tables)

```
User → Organization (many-to-one)
User → Agent (one-to-many)
Agent → KnowledgeDocument (many-to-many via AgentKnowledgeBase)
Agent → Conversation (one-to-many)
Conversation → Message (one-to-many)
Conversation → FlaggedQuery (one-to-one, optional)
Agent → ApiUsage (one-to-many)
Organization → OrganizationQuota (one-to-one)
```

All schema details in [prisma/schema.prisma](./prisma/schema.prisma).

---

## 🔐 Authentication & Authorization

- **Email/password** authentication via NextAuth.js
- **Role-based access control:**
  - `AGRONOMIST` → `/dashboard/*` access
  - `FARMER` → `/chat/*` access
  - `ADMIN` → Full access
- **Protected routes** enforced by middleware
- **Sessions** stored in database with Prisma adapter

---

## 🎯 Key Features (Planned)

### For Agronomists
- Create/configure AI agents (name, prompt, confidence threshold)
- Upload knowledge base documents (PDF, DOCX, TXT)
- RAG pipeline: chunk → embed → vector store
- Review low-confidence queries flagged by agents
- Provide human override responses
- Monitor usage analytics (queries, tokens, cost)
- Manage organization settings and quotas

### For Farmers
- Chat with AI agents via mobile-optimized PWA
- Select agent based on farming needs
- Get instant advice on crops, pests, weather, etc.
- Upload photos (future: pest/disease identification)
- Rate agent responses (feedback loop)
- WhatsApp integration (future)

### System Intelligence
- Claude Sonnet 4.5 for natural language understanding
- RAG (Retrieval-Augmented Generation) for knowledge retrieval
- Confidence scoring for responses
- Auto-flag low-confidence queries for human review
- Multi-tenant vector DB with namespace isolation

---

## 📱 PWA & Mobile Strategy

**Why PWA?**
- Ghana's farmers primarily use mobile phones
- No app store submission/approval required
- Cross-platform (Android, iOS, desktop)
- Offline capabilities (future)
- Push notifications (future)
- Installable via browser

**Implementation Status:** ⚠️ Not yet implemented (high priority before backend)

**Requirements:**
- [ ] Responsive design across mobile breakpoints (sm: 640px, md: 768px)
- [ ] Touch-friendly UI (button sizes, tap targets)
- [ ] `manifest.json` for PWA metadata
- [ ] Service worker for offline support
- [ ] Optimized images for mobile bandwidth
- [ ] Test on real devices (Android, iOS)

See [TODO.md](./TODO.md) for PWA implementation checklist.

---

## 🔧 Development Workflow

### Running Locally

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
```

### Database Commands

```bash
npx prisma generate            # Regenerate Prisma client
npx prisma migrate dev         # Create & apply migration
npx prisma db push             # Push schema changes (no migration)
npx prisma studio              # Open Prisma Studio GUI
npm run db:seed                # Seed test data
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"

# Anthropic (future)
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [SETUP.md](./SETUP.md) | Initial setup instructions |
| [CLAUDE-handoff.md](./CLAUDE-handoff.md) | Complete project context for AI assistants |
| [AUTH.md](./AUTH.md) | Authentication implementation notes |
| [AUTH-COMPLETE.md](./AUTH-COMPLETE.md) | Auth system completion checklist |
| [SCROLLING-LAYOUT.md](./SCROLLING-LAYOUT.md) | Dashboard scrolling pattern guide |
| [LANDING-PAGE.md](./LANDING-PAGE.md) | Landing page component breakdown |
| [CHAT-PAGE-COMPLETE.md](./CHAT-PAGE-COMPLETE.md) | Chat interface completion notes |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | Design tokens and patterns |
| [TODO.md](./TODO.md) | Current priorities and roadmap |

---

## 🎓 Academic Context

This is a **Capstone project** for Computer Science at Ashesi University (Spring 2026). The project addresses a real-world problem faced by **Farmitecture**, an Accra-based urban farming startup serving 70+ customers with only 2 agronomists.

**Key Deliverables:**
- Working prototype (this repository)
- Pilot testing with 10-15 Farmitecture farmers
- Academic documentation (requirements, architecture, testing)
- Final presentation and defense

**Problem Statement:**  
Ghana has a 1:10,000 agronomist-to-farmer ratio. Cultivate uses AI to scale personalized agricultural extension services without compromising quality.

---

## 📞 Contact

**Developer:** Kelvin Ahiakpor  
**Supervisor:** Dr. David Ebo Adjepon-Yamoah  
**Partner:** Farmitecture (farmitecture.com)

---

## 📄 License

[LICENSE](./LICENSE) — Academic project, proprietary to Ashesi University & Farmitecture.

---

## 🙏 Acknowledgments

- **Farmitecture team** for partnership and domain expertise
- **Dr. Adjepon-Yamoah** for academic supervision
- **Ashesi University** Computer Science Department
- **Anthropic** for Claude AI API (future integration)

---

**Last Updated:** February 11, 2026
