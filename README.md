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
broadcasts changes back. Hocuspocus periodically persists Yjs document snapshots (binary
state) to PostgreSQL via a NestJS-exposed persistence hook. NestJS handles everything
outside real-time sync: user auth, document list, and sharing/permissions
(owner/editor/viewer roles).

```
┌──────────┐   WS (Yjs updates)   ┌─────────────┐   persistence hook   ┌────────────┐
│  web      │◄────────────────────►│ sync-server │◄────────────────────►│  api        │
│ (Next.js, │                       │ (Hocuspocus)│                       │ (NestJS)    │
│  Tiptap,  │                       └─────────────┘                       │  + Prisma   │
│  Yjs)     │                                                              └─────┬──────┘
└─────┬─────┘                          REST (auth, docs, permissions)            │
      └───────────────────────────────────────────────────────────────────────►│
                                                                          ┌──────▼──────┐
                                                                          │ PostgreSQL  │
                                                                          └─────────────┘
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
4. [ ] **Phase 4** — Wire Hocuspocus's `onStoreDocument` / `onLoadDocument` hooks to
   persist/load Yjs snapshots from PostgreSQL via Prisma.
5. [ ] **Phase 5** — Collaboration cursors/awareness (names, colors, live cursor position)
   via `@tiptap/extension-collaboration-cursor`.
6. [ ] **Phase 6** — Document sharing (invite by email, role-based permission enforcement)
   and a document list/dashboard UI (Ant Design + Tailwind).
7. [ ] **Phase 7 (stretch)** — Version history, Redis-based horizontal scaling for
   Hocuspocus, Docker + Nginx deployment config.

## Getting started

**Frontend + sync server** (Phases 1–2):

```bash
cd web && pnpm install && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). In another terminal:

```bash
cd sync-server && pnpm install && pnpm dev
```

**Backend API** (Phase 3):

```bash
docker compose up -d postgres
cd api && pnpm install && cp .env.example .env   # fill in JWT_SECRET
pnpm prisma migrate dev
pnpm start:dev   # http://localhost:3001
```
