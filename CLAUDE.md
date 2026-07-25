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
- **Backend API:** NestJS (auth, document metadata, permissions) — `api/`
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
- **Phase 3 — done, committed** (`01e4ec9`): NestJS backend (`api/`) — Passport+JWT auth
  (bcrypt, register/login/me), Prisma schema (User/Document/DocumentSnapshot/
  DocumentPermission) against Postgres (via `docker-compose.yml`), document CRUD, and
  role-based permissions (owner/editor/viewer) enforced by a `DocumentRoleGuard`, including
  last-owner protection. Verified end-to-end via curl (register → login → CRUD → every
  guard tier → last-owner rule → cascade delete).
- **Phase 4 — done, committed** (`6e31a70`): `sync-server` gets its own Prisma client (a
  minimal, never-migrated mirror of `api`'s schema — `api` stays the canonical
  migration owner) and talks to Postgres directly from `onLoadDocument`/`onStoreDocument`.
  `onLoadDocument` rejects any room name that isn't a real `Document.id` (fails fast
  instead of hitting an FK violation later); `onStoreDocument` appends a new
  `DocumentSnapshot` version each debounced save (2s/10s), setting up Phase 7's version
  history. Verified end-to-end with a standalone script
  (`sync-server/scripts/verify-persistence.ts`): create a document via `api` → write
  content over WebSocket → disconnect → reconnect fresh → content restored from Postgres;
  plus the unknown-room-name rejection path.
- **Phase 5 — done, committed** (`bc6fc6b`): collaboration cursors/awareness via
  `@tiptap/extension-collaboration-caret` (Tiptap v3 renamed it from `-cursor` to
  `-caret` — the README's original phase description used the old name). Cursor
  identity is the real logged-in user, not a placeholder: `web` gained its first API
  client and auth (`web/src/lib/apiClient.ts`, `AuthProvider.tsx`, `AuthForm.tsx`)
  against `api`'s existing JWT auth, which required adding CORS to `api` (it had
  none before — `api/src/main.ts`, `WEB_ORIGIN` env var). Cursor color is deterministic
  per-user-id (`collaboratorColor.ts`), and a presence list reuses the same
  `provider.awareness` states (`useAwarenessStates.ts`).
- **Phase 6 — done, committed** (`9f1bb7d`): document dashboard (`web/src/app/dashboard/`)
  and a sharing UI (`web/src/components/ShareModal.tsx`), built entirely against the
  sharing/permissions API that Phase 3 already shipped
  (`/documents/:id/permissions` — no `api` route changes needed). Ant Design was added
  for the first time in this repo (`antd`, `@ant-design/nextjs-registry` for the App
  Router SSR registry); Tailwind v4 and antd coexist via `StyleProvider`'s `layer` prop
  (passed straight to `AntdRegistry`, which already wraps `StyleProvider` internally —
  no need to import `@ant-design/cssinjs` directly, that breaks in a Server Component)
  plus an explicit `@layer theme, base, antd, components, utilities;` order in
  `globals.css` so Tailwind utilities still win. Routing changed: `/` is now a pure
  auth gate that redirects to `/dashboard`; `/documents/[documentId]` replaced the old
  inline editor and resolves its Yjs room id from the URL instead of
  `useOwnDocument.ts` (deleted — its own comment already called out this phase as its
  retirement). The document editor page derives the current user's role by matching
  their id against the `listPermissions` response already needed for the collaborator
  list, rather than adding a role field to `GET /documents/:id` — owners see the Share
  modal, everyone else sees a read-only collaborator popover. One `api` fix was needed:
  `PermissionsService.assign`/`updateRole` returned the bare `DocumentPermission` row
  without the `user` relation that `list()` already included, which crashed the
  frontend on render after a successful share — both now `include: { user: {...} }` to
  match. Verified end-to-end with two users: share by email (including the
  no-such-user 404 and last-owner-protection 400 error paths), role-gated UI, and live
  co-editing through the new route. Known gap carried forward: the sync server still
  doesn't enforce roles at the WebSocket layer, so a viewer with the room id could
  technically still send Yjs writes — unchanged from before, not a Phase 6 regression.
- **Phase 7a (version history) — done, not yet committed**: `sync-server` gains its
  first HTTP surface — a small internal-only REST endpoint added via Hocuspocus's
  `onRequest` extension hook (`sync-server/src/internalApi.ts`), gated by a shared
  secret (`INTERNAL_SECRET`/`SYNC_SERVER_INTERNAL_SECRET` env vars) since it's reachable
  on the same port browsers already connect to over WebSocket. The actual revert
  (`sync-server/src/restore.ts`) decodes an old `DocumentSnapshot`'s bytes into a scratch
  `Y.Doc`, then uses `Hocuspocus#openDirectConnection` to run one transaction against the
  *live* Y.Doc that clones the old content over the current content (Yjs updates are
  additive, so this can't be done via `Y.applyUpdate` — see the file's own comments for
  why). Content is cloned generically at the `Y.XmlFragment`/`XmlElement`/`XmlText`
  level rather than via `y-prosemirror`/ProseMirror JSON, keeping `sync-server` free of
  any editor-schema knowledge (Tiptap's `Collaboration` extension's default field name,
  `"default"`, confirmed against the installed package). Because the revert is a normal
  transaction, it flows through the existing broadcast-to-connected-clients and
  debounced-autosave pipeline for free, and works even when nobody has the document
  open (`openDirectConnection` loads it from Postgres first via the existing
  `onLoadDocument` hook). `api` owns the actual authorization (`GET`/`POST
  /documents/:id/versions|restore`, viewer/editor role-gated via the existing
  `DocumentRoleGuard`) and relays to sync-server's internal endpoint — sync-server
  itself still does no per-user checks, consistent with the already-documented
  WS-layer gap. Web: a "History" button next to Share/Collaborators opens
  `VersionHistoryPanel.tsx` (list of versions with a per-row Restore button, editor+
  only, with a confirm step since it overwrites what collaborators are currently
  looking at). Verified end-to-end: restore while the doc is open (live update in the
  browser, no reload), restore while nobody has it open (via a direct call to
  sync-server, confirmed it loads via `onLoadDocument`), and viewer-role gating both in
  the UI (no Restore buttons) and at the API (`POST .../restore` returns 403 for a
  viewer, 401 unauthenticated). One real bug caught and fixed during this verification:
  the internal endpoint's success-path handler originally called its "write response"
  helper *inside* the same `try` whose `catch` also called it — since that helper
  always throws after writing (the mechanism used to stop Hocuspocus's own request
  handler from also writing a fallback "Welcome to Hocuspocus!" response onto an
  already-ended one, see `internalApi.ts`'s comments), the throw from the success path
  was being caught by the adjacent `catch` and triggering a second write, crashing the
  process with `ERR_HTTP_HEADERS_SENT` on every successful restore. Fixed by moving the
  success response outside the `try`/`catch`. `tsx watch` auto-restarted the process
  each time this was hit during testing, which is why it wasn't more disruptive to
  diagnose — worth knowing if this pattern (throw-to-signal-handled in a Hocuspocus
  `onRequest` hook) is reused elsewhere in `sync-server`.
- **Phase 7 (stretch), remaining** — not started: Redis-based horizontal scaling for
  Hocuspocus, Docker + Nginx deployment config.

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

Per subproject (`web/`, `sync-server/`, `api/`):

| | web | sync-server | api |
|---|---|---|---|
| dev | `pnpm --dir web dev` | `pnpm --dir sync-server dev` | `pnpm --dir api start:dev` |
| build | `pnpm --dir web build` | `pnpm --dir sync-server build` | `pnpm --dir api build` |
| lint | `pnpm --dir web lint` | *(none yet)* | `pnpm --dir api lint` |
| test | *(no test suite yet)* | `pnpm --dir sync-server exec tsx scripts/verify-persistence.ts` *(standalone script, not a real test runner)* | `pnpm --dir api test` *(Nest CLI defaults only, no hand-written suites yet)* |

Both `api` and `sync-server` need Postgres running: `docker compose up -d postgres`
(repo root). Only `api` runs migrations (`pnpm --dir api prisma migrate dev`) — its
`prisma/schema.prisma` is canonical. `sync-server` has its own minimal
`prisma/schema.prisma` (mirrors just `Document`/`DocumentSnapshot`) that is never
migrated, only `prisma generate`d (`pnpm --dir sync-server exec prisma generate`) after
pulling schema changes made in `api`.

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
