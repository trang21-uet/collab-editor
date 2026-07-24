"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";

export type Collaborator = { clientId: number; name: string; color: string };

// CollaborationCaret (see CollaborativeEditor.tsx) writes { name, color } into
// each client's local awareness state under the "user" field — this hook just
// mirrors the current set of remote+local states for a "who's here" list.
export function useAwarenessStates(provider: HocuspocusProvider | null): Collaborator[] {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) {
      setCollaborators([]);
      return;
    }

    const sync = () => {
      const next: Collaborator[] = [];
      awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { name?: string; color?: string } }).user;
        if (user?.name && user?.color) {
          next.push({ clientId, name: user.name, color: user.color });
        }
      });
      setCollaborators(next);
    };

    sync();
    awareness.on("change", sync);
    return () => {
      awareness.off("change", sync);
    };
  }, [provider]);

  return collaborators;
}
