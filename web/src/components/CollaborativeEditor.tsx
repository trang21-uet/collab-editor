"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import StarterKit from "@tiptap/starter-kit";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { colorForUserId } from "@/lib/collaboratorColor";
import { useAwarenessStates } from "@/lib/useAwarenessStates";

export function CollaborativeEditor({
  provider,
  label,
  user,
}: {
  provider: HocuspocusProvider;
  label: string;
  user: { id: string; name: string };
}) {
  // HocuspocusProvider itself no longer exposes `.status` directly (installed
  // @hocuspocus/provider@4.4 moved the websocket connection state onto the shared
  // underlying websocket it wraps, to support multiplexing several document
  // providers over one connection) — the "status" event it forwards still fires the
  // same shape, only the synchronous initial read moved.
  const [status, setStatus] = useState(
    provider.configuration.websocketProvider.status,
  );
  const collaborators = useAwarenessStates(provider);
  const color = colorForUserId(user.id);

  useEffect(() => {
    const onStatus = ({ status: next }: { status: typeof status }) =>
      setStatus(next);
    provider.on("status", onStatus);
    return () => {
      provider.off("status", onStatus);
    };
  }, [provider]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        // Collaboration extension manages undo/redo via Yjs, so StarterKit's own history must be disabled.
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: provider.document }),
        // Renders remote cursors/selections from the same provider.awareness
        // used by useAwarenessStates below; publishes our own name/color into
        // awareness so other clients render our cursor too.
        CollaborationCaret.configure({
          provider,
          user: { name: user.name, color },
        }),
      ],
    },
    [provider],
  );

  return (
    <div className="flex-1 rounded-lg border border-black/10 dark:border-white/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black/50 dark:text-white/50">
          {label}
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          {status}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {collaborators.map((collaborator) => (
          <span
            key={collaborator.clientId}
            className="flex items-center gap-1.5 rounded-full border border-black/10 px-2 py-0.5 text-xs dark:border-white/20"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: collaborator.color }}
            />
            {collaborator.name}
          </span>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
