"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, List, Popover, Spin, Typography } from "antd";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { ShareModal } from "@/components/ShareModal";
import { VersionHistoryPanel } from "@/components/VersionHistoryPanel";
import { api, ApiError, type Document, type Permission } from "@/lib/apiClient";
import { useHocuspocusProvider } from "@/lib/useHocuspocusProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";

export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { user, token, status } = useRequireAuth();

  const [doc, setDoc] = useState<Document | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.getDocument(token, documentId), api.listPermissions(token, documentId)])
      .then(([fetchedDoc, perms]) => {
        if (cancelled) return;
        setDoc(fetchedDoc);
        setPermissions(perms);
      })
      .catch((err) => {
        if (cancelled) return;
        setError({
          status: err instanceof ApiError ? err.status : 0,
          message: err instanceof ApiError ? err.message : "Failed to load document",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, documentId]);

  // Room name/write access at the WebSocket layer isn't role-checked by the
  // sync server yet (see README build order, Phase 7) — this only connects
  // once the REST layer above has already confirmed at least viewer access.
  const provider = useHocuspocusProvider(!loading && !error ? documentId : null);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spin />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">
          {error.status === 404 ? "Document not found." : error.status === 403 ? "You don't have access to this document." : error.message}
        </p>
        <a href="/dashboard" className="text-sm underline">
          Back to dashboard
        </a>
      </main>
    );
  }

  if (!doc || !user || !token) return null;

  const myRole = permissions.find((p) => p.userId === user.id)?.role ?? "viewer";
  const isOwner = myRole === "owner";
  const canRestore = myRole === "owner" || myRole === "editor";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <a href="/dashboard" className="text-xs text-black/50 underline dark:text-white/50">
            Back to dashboard
          </a>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {doc.title}
          </Typography.Title>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setHistoryOpen(true)}>History</Button>
          {isOwner ? (
            <Button type="primary" onClick={() => setShareOpen(true)}>
              Share
            </Button>
          ) : (
            <Popover
              title="Collaborators"
              content={
                <List
                  size="small"
                  dataSource={permissions}
                  renderItem={(p) => (
                    <List.Item>
                      {p.user.name} — {p.role}
                    </List.Item>
                  )}
                />
              }
            >
              <Button>Collaborators</Button>
            </Popover>
          )}
        </div>
      </div>

      {provider && (
        <CollaborativeEditor
          provider={provider}
          label={doc.title}
          user={{ id: user.id, name: user.name }}
        />
      )}

      {isOwner && (
        <ShareModal
          documentId={documentId}
          token={token}
          permissions={permissions}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onPermissionsChange={setPermissions}
        />
      )}

      <VersionHistoryPanel
        documentId={documentId}
        token={token}
        canRestore={canRestore}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </main>
  );
}
