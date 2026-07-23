"use client";

import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { useHocuspocusProvider } from "@/lib/useHocuspocusProvider";

const DOCUMENT_NAME = "phase-2-demo";

export default function Home() {
  const provider = useHocuspocusProvider(DOCUMENT_NAME);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">CRDT Playground — Phase 2</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          This editor syncs through a standalone Hocuspocus WebSocket server
          (document: <code>{DOCUMENT_NAME}</code>). Open this page in a
          second browser tab and type in either — changes should appear in
          both within milliseconds.
        </p>
      </div>
      {provider ? (
        <CollaborativeEditor provider={provider} label={`ws://localhost:1234`} />
      ) : (
        <p className="text-sm text-black/40 dark:text-white/40">Connecting…</p>
      )}
    </main>
  );
}
