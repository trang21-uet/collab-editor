# web

Next.js 15 (App Router) + Tiptap + Yjs frontend for the collaborative document editor.
See the [project README](../README.md) for overall architecture and build phases.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Status

**Phase 1** — two Tiptap editors sharing a single in-memory `Y.Doc` (no server), confirming
the CRDT binding works. See [`src/components/CollaborativeEditor.tsx`](src/components/CollaborativeEditor.tsx)
and [`src/app/page.tsx`](src/app/page.tsx).
