# sync-server

Standalone [Hocuspocus](https://tiptap.dev/docs/hocuspocus) WebSocket server: relays Yjs
CRDT updates between connected `web` clients and persists document state to Postgres.
Has no shared code with `api` — see the [project README](../README.md) for why each app
owns its own Prisma schema against the same database.

## Getting started

```bash
pnpm install
cp .env.example .env   # INTERNAL_SECRET must match api's SYNC_SERVER_INTERNAL_SECRET
pnpm exec prisma generate
pnpm dev   # ws://localhost:1234
```

## Environment variables (`.env.example`)

- `DATABASE_URL` — Postgres connection string, same DB as `api`.
- `PORT` — defaults to `1234`.
- `INTERNAL_SECRET` — shared secret for the internal HTTP route below; must match `api`'s
  `SYNC_SERVER_INTERNAL_SECRET`.

## What it does

- `src/server.ts` — Hocuspocus server entry point. Wires `onLoadDocument` /
  `onStoreDocument` (`src/persistence.ts`) to load/save `DocumentSnapshot` rows, debounced
  so rapid keystrokes don't hit Postgres on every Yjs update. Rejects unknown room names
  (a document must already exist via `api` before anyone can sync to it).
- `src/persistence.ts` — append-only `DocumentSnapshot` versioning per document.
- `src/restore.ts` — reverts a live `Y.Doc` to an older snapshot's content in one
  transaction (Yjs updates are additive, so a plain `Y.applyUpdate` can't express "go
  back" — this clones the old snapshot's `Y.XmlFragment` over the live doc instead), via
  Hocuspocus's `openDirectConnection` so it works whether or not anyone currently has the
  document open.
- `src/internalApi.ts` — one internal-only HTTP route, `POST
  /internal/documents/:id/restore`, gated by the `x-internal-secret` header (only `api`
  knows the secret; `api` does its own per-user role check before ever calling this).
  Reachable on the same port browsers connect to over WebSocket, so it never trusts
  caller identity beyond the shared secret — and in the Docker/Nginx deployment, Nginx
  additionally 404s this path from the public entrypoint entirely (defense in depth; see
  `nginx/nginx.conf`).
- `scripts/verify-persistence.ts` — standalone script exercising the persistence path end
  to end without a browser.

## Scripts

```bash
pnpm dev     # tsx watch src/server.ts
pnpm build   # tsc -> dist/
pnpm start   # node dist/server.js
```
