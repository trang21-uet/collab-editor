"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import type * as Y from "yjs";

export function CollaborativeEditor({
  ydoc,
  label,
}: {
  ydoc: Y.Doc;
  label: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Collaboration extension manages undo/redo via Yjs, so StarterKit's own history must be disabled.
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
    ],
  });

  return (
    <div className="flex-1 rounded-lg border border-black/10 dark:border-white/20 p-4">
      <h2 className="mb-2 text-sm font-semibold text-black/50 dark:text-white/50">
        {label}
      </h2>
      <EditorContent editor={editor} />
    </div>
  );
}
