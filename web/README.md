# web

Next.js 15 (App Router) + Tiptap + Yjs frontend for the collaborative document editor.
See the [project README](../README.md) for overall architecture and build phases.

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). `/` redirects to `/dashboard` once
logged in; `/documents/[documentId]` is the live editor route. See the
[project README](../README.md) for the full build order and the other apps this depends
on (`api`, `sync-server`).

## Status

All planned phases through 7b are implemented:

- Real-time co-editing via Tiptap + Yjs, synced over WebSocket to `sync-server`
  (`src/components/CollaborativeEditor.tsx`).
- Auth (register/login/logout, JWT in `localStorage`) against `api`
  (`src/lib/AuthProvider.tsx`).
- Live collaboration cursors, per-user color, and a presence list off
  `provider.awareness` (`src/lib/useAwarenessStates.ts`, `collaboratorColor.ts`).
- Document dashboard (`src/app/dashboard/`) and sharing UI
  (`src/components/ShareModal.tsx`), role-gated (owner/editor/viewer).
- Version history — a History button + confirm-to-restore flow, editor+ only.
- Ant Design + Tailwind for styling.

Only the Redis horizontal-scaling stretch item (in `sync-server`) is not built — see the
project README's build order.
