# collab-editor

A real-time collaborative document editor (Notion/Google Docs–style), built from scratch
to learn CRDTs and WebSocket-based sync.

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Rich text editor:** Tiptap + `@tiptap/extension-collaboration` + `@tiptap/extension-collaboration-cursor`
- **CRDT engine:** Yjs
- **Real-time sync server:** Hocuspocus (Node.js)
- **Backend API:** NestJS (auth, document metadata, permissions)
- **Database:** PostgreSQL + Prisma ORM
- **Scaling (later phase):** Redis Pub/Sub for multi-instance broadcast
- **Styling:** TailwindCSS + Ant Design
- **State management:** Zustand (UI state only — document state is owned by Yjs)

## Architecture

Each client holds an in-memory Yjs document; edits are small binary "updates" sent over
WebSocket to the Hocuspocus server, which merges updates from all connected clients and
broadcasts changes back. Hocuspocus persists Yjs document snapshots (binary state) to
PostgreSQL directly via its own Prisma client, in its `onLoadDocument`/`onStoreDocument`
hooks — `sync-server` and `api` are both standalone apps with no shared code, so each owns
a Prisma schema against the same database; `api`'s is canonical and owns all migrations,
`sync-server`'s is a minimal, never-migrated mirror. NestJS handles everything outside
real-time sync: user auth, document list, and sharing/permissions (owner/editor/viewer
roles).

```
┌──────────┐   WS (Yjs updates)   ┌─────────────┐
│  web      │◄────────────────────►│ sync-server │
│ (Next.js, │                       │ (Hocuspocus)│
│  Tiptap,  │                       └──────┬──────┘
│  Yjs)     │                              │ Prisma (DocumentSnapshot)
└─────┬─────┘                              │
      │ REST (auth, docs, permissions)     │
      ▼                                    ▼
┌────────────┐                      ┌─────────────┐
│  api        │  Prisma (User,      │ PostgreSQL  │
│ (NestJS)    │──Document, etc.)───►│             │
│  + Prisma   │                      └─────────────┘
└────────────┘
```

## Repo structure

```
collab-editor/
├── web/           Next.js frontend (Phase 1 ✅)
├── api/           NestJS backend — auth, document CRUD, permissions (Phase 3 ✅)
└── sync-server/   Standalone Hocuspocus WebSocket server (Phase 2 ✅)
```

Each app is a standalone project (its own `package.json`, no workspace linking) — see the
build order below for why.

## Data model (Prisma, `api`)

- **User** — id, email, name
- **Document** — id, title, ownerId, createdAt, updatedAt
- **DocumentSnapshot** — documentId, ydocState (Bytes), version, savedAt
- **DocumentPermission** — documentId, userId, role (`owner` | `editor` | `viewer`)

## Build order

1. [x] **Phase 1** — Minimal Next.js + Tiptap + Yjs, no server: confirm the editor renders
   and local CRDT updates propagate between two editor instances sharing one `Y.Doc`.
2. [x] **Phase 2** — Standalone Hocuspocus server; connect the frontend over WebSocket and
   verify two browser tabs stay in sync in real time.
3. [x] **Phase 3** — NestJS backend: auth, Prisma schema per the data model above, REST API
   for document CRUD and permissions.
4. [x] **Phase 4** — Wire Hocuspocus's `onStoreDocument` / `onLoadDocument` hooks to
   persist/load Yjs snapshots from PostgreSQL via Prisma.
5. [x] **Phase 5** — Collaboration cursors/awareness (names, colors, live cursor position)
   via `@tiptap/extension-collaboration-caret` (the extension was renamed from
   `-cursor` to `-caret` in Tiptap v3).
6. [x] **Phase 6** — Document sharing (invite by email, role-based permission enforcement)
   and a document list/dashboard UI (Ant Design + Tailwind).
7. **Phase 7 (stretch)**:
   - [x] Version history — restore an older `DocumentSnapshot` version. The revert runs
     server-side in `sync-server` via Hocuspocus's `openDirectConnection`, so it works
     whether or not anyone currently has the document open; `api` exposes
     `GET/POST /documents/:id/versions|restore` (role-gated) and relays to a new
     internal-only endpoint on `sync-server` over a shared secret.
   - [ ] Redis-based horizontal scaling for Hocuspocus.
   - [ ] Docker + Nginx deployment config.

## Getting started

**Database** (needed by both `api` and `sync-server`, Phases 3–4):

```bash
docker compose up -d postgres
```

**Backend API** (Phase 3) — owns the schema and all migrations:

```bash
cd api && pnpm install && cp .env.example .env   # fill in JWT_SECRET
pnpm prisma migrate dev
pnpm start:dev   # http://localhost:3001
```

**Sync server** (Phases 2 & 4) — persists Yjs snapshots directly to the same database:

```bash
cd sync-server && pnpm install && cp .env.example .env
pnpm exec prisma generate
pnpm dev   # ws://localhost:1234
```

**Frontend** (Phase 1):

```bash
cd web && pnpm install && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Register/log in (this calls `api`
directly, so it needs `NEXT_PUBLIC_API_URL` set and `api`'s CORS `WEB_ORIGIN` to match —
see `web/.env.local.example`) and you'll land on `/dashboard`, where you can create a
document or open one shared with you. Share a document with another registered user's
email from its Share button (owner only); log in as that user in a second tab/profile to
test cursors, presence, and live co-editing together.
