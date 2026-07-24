"use client";

import { useEffect, useState } from "react";
import { api } from "./apiClient";

// Resolves the current user's first document, creating one if they have
// none yet. Standing in for the document dashboard/switcher UI, which is
// Phase 6 scope — this just needs one real Document.id for the sync server
// to load/persist against (it rejects any room name that isn't one).
export function useOwnDocument(token: string | null) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setDocumentId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const documents = await api.listDocuments(token);
        const document = documents[0] ?? (await api.createDocument(token, "My Document"));
        if (!cancelled) setDocumentId(document.id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { documentId, loading, error };
}
