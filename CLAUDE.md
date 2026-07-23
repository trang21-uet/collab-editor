# collab-editor

## Project description

A Notion/Google-Docs-style real-time collaborative document editor, built as a personal
learning project. The primary goal is to learn **WebSocket-based real-time sync and CRDTs
(Yjs)** — prioritize clear, well-explained code over premature optimization, especially in
sync/merge logic.

**Stack (decided, not open questions):**

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript — `web/`
- **Rich text editor:** Tiptap + `@tiptap/extension-collaboration` +
  `@tiptap/extension-collaboration-cursor`
- **CRDT engine:** Yjs
- **Real-time sync server:** Hocuspocus (Node.js) — `sync-server/`
- **Backend API:** NestJS (auth, document metadata, permissions) — `api/` (not yet scaffolded)
- **Database:** PostgreSQL + Prisma ORM
- **Scaling (later phase):** Redis Pub/Sub for multi-instance broadcast
- **Styling:** TailwindCSS + Ant Design
- **State management:** Zustand (UI state only — document state is owned by Yjs)

Each app (`web`, `sync-server`, `api`) is a standalone project with its own `package.json` —
no workspace linking. See `README.md` for the full architecture diagram and data model.

## Current status

- **Phase 1 — done, committed** (`2b44991`): minimal Next.js + Tiptap + Yjs, no server,
  local CRDT sync between two editor instances sharing one `Y.Doc`.
- **Phase 2 — done, committed** (`0b8d3ca`): standalone Hocuspocus server (`sync-server/`)
  and a `useHocuspocusProvider` hook (`web/src/lib/`) wiring the frontend to it over
  WebSocket; verified real-time sync across two browser tabs.
- **Phase 3–7 — not started**: NestJS + Prisma backend, snapshot persistence, awareness/
  cursors, sharing/permissions, version history, horizontal scaling. See `README.md`
  "Build order" for the full list.

## Coding conventions

- TypeScript strict mode.
- ESLint + Prettier for formatting/linting.
- English names for all variables, functions, types.
- **Comment thoroughly on CRDT/sync logic** (Yjs document updates, Hocuspocus hooks,
  awareness/presence, conflict resolution) — this is the part being learned, so explain the
  *why*, not just the *what*, even where the code would otherwise be considered
  self-explanatory.
- Everywhere else, keep comments minimal — explain non-obvious constraints only.

## Standard project commands

Per subproject (`web/`, `sync-server/`; `api/` once scaffolded):

| | web | sync-server |
|---|---|---|
| dev | `pnpm --dir web dev` | `pnpm --dir sync-server dev` |
| build | `pnpm --dir web build` | `pnpm --dir sync-server build` |
| lint | `pnpm --dir web lint` | *(none yet — add ESLint config before Phase 3)* |
| test | *(no test suite yet — add before/during Phase 2 sync-logic work)* | *(same)* |

`api/` commands will be filled in once it's scaffolded (Phase 3).

## Things that must NEVER be done without asking first

- Force-pushing, or any destructive git history rewrite.
- Editing or removing a Prisma migration that has already been applied.
- Changing the schema/shape of a Yjs document that already has real data in it (this is a
  breaking change for every existing snapshot — needs an explicit migration plan).
- Deleting `.env` files.
- Adding a major new dependency (auth provider, payment, cloud SDK, etc.) not already listed
  in the stack above.
- Anything in the "explicit permission required" / "prohibited" categories from the
  operating environment's own safety rules (force-push, credential entry, etc.) — those
  apply regardless of what's written here.

## Sync architecture changes require discussion first

Any change touching the sync architecture — the Yjs provider setup, conflict resolution,
awareness/presence, or how Hocuspocus persists/loads documents — must stop and explain the
trade-offs *before* writing code. This is the part of the project being actively learned;
don't silently pick an approach and implement it.

## Per-feature workflow

For every feature/task handed off (via an issue or a short description):

1. Enter Plan Mode first; present the plan plus risks/trade-offs. Stop and wait for
   approval before writing code.
2. Once approved, write code and let the lint hook run automatically; self-fix lint
   failures before reporting back.
3. If a fix loop goes more than 3 iterations without resolving, stop, report specifics, and
   ask rather than continuing to retry.
4. When done, summarize the changes (key diffs, files touched, risks to note) for review —
   never commit or push without explicit confirmation.
