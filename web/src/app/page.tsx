"use client";

import { useMemo } from "react";
import * as Y from "yjs";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";

export default function Home() {
  // Stable across re-renders; not a server-synced doc yet — that's Phase 2.
  const ydoc = useMemo(() => new Y.Doc(), []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">CRDT Playground — Phase 1</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Both editors below are bound to the same in-memory Yjs document, with
          no server involved. Type in either one — Yjs merges the edits and
          both panes converge, confirming the Tiptap ↔ Yjs binding works
          before WebSocket sync is introduced in Phase 2.
        </p>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <CollaborativeEditor ydoc={ydoc} label="Editor A" />
        <CollaborativeEditor ydoc={ydoc} label="Editor B" />
      </div>
    </main>
  );
}
