"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import type { HocuspocusProvider } from "@hocuspocus/provider";

export function CollaborativeEditor({
  provider,
  label,
}: {
  provider: HocuspocusProvider;
  label: string;
}) {
  const [status, setStatus] = useState(provider.status);

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
      <EditorContent editor={editor} />
    </div>
  );
}
