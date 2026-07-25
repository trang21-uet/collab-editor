# api

NestJS backend for the collaborative document editor: auth, document metadata, sharing
permissions, and version history. Owns the canonical Prisma schema and all migrations
against the shared Postgres database (`sync-server` mirrors the relevant tables but never
migrates them — see the [project README](../README.md) for why).

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in JWT_SECRET and SYNC_SERVER_INTERNAL_SECRET
pnpm prisma migrate dev
pnpm start:dev   # http://localhost:3001
```

## Environment variables (`.env.example`)

- `DATABASE_URL` — Postgres connection string, same DB as `sync-server`.
- `JWT_SECRET`, `JWT_EXPIRES_IN` — auth token signing.
- `PORT` — defaults to `3001`.
- `WEB_ORIGIN` — CORS allow-origin for local dev (unused behind the Nginx deployment,
  where `web`'s calls become same-origin).
- `SYNC_SERVER_INTERNAL_URL`, `SYNC_SERVER_INTERNAL_SECRET` — how `api` reaches
  `sync-server`'s internal-only restore endpoint; secret must match `sync-server`'s
  `INTERNAL_SECRET`.

## REST API

All routes except `/auth/register` and `/auth/login` require a JWT (`Authorization: Bearer
<token>`); routes under `/documents/:id` also require the caller to hold the role noted.

**Auth** (`src/auth`)
- `POST /auth/register`, `POST /auth/login`
- `GET /auth/me` — current user

**Documents** (`src/documents`)
- `POST /documents` — create
- `GET /documents` — list the caller's documents
- `GET /documents/:id`, `PATCH /documents/:id`, `DELETE /documents/:id`
- `GET /documents/:id/versions` — list `DocumentSnapshot` history
- `POST /documents/:id/restore` — restore an older snapshot (editor+), relays to
  `sync-server`'s internal endpoint over `SYNC_SERVER_INTERNAL_SECRET`

**Permissions** (`src/permissions`, mounted under `/documents/:documentId/permissions`)
- `POST /` — share with a user by email (owner only)
- `GET /` — list collaborators (includes each `user` relation)
- `PATCH /:userId` — change a collaborator's role
- `DELETE /:userId` — revoke access (blocked on the last remaining owner)

## Data model

See the [project README](../README.md#data-model-prisma-api) for the full `User` /
`Document` / `DocumentSnapshot` / `DocumentPermission` schema, or `prisma/schema.prisma`
directly.

## Scripts

```bash
pnpm start:dev    # watch mode
pnpm build        # nest build -> dist/src/main.js
pnpm start:prod   # node dist/src/main
pnpm lint
pnpm test         # unit tests (jest)
pnpm test:e2e
```

## Prisma 7 notes

Uses the classic `prisma-client-js` generator (not the new ESM-native `prisma-client`,
which breaks this CommonJS Nest build) plus the `@prisma/adapter-pg` driver adapter,
required as of Prisma 7 even for a plain `DATABASE_URL`. `prisma.config.ts` (next to
`package.json`) is required for `prisma migrate deploy` to pick up `DATABASE_URL` — see
the root [CLAUDE.md](../CLAUDE.md) for the full gotcha list.
