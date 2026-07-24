"use client";

import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/AuthProvider";
import { useHocuspocusProvider } from "@/lib/useHocuspocusProvider";
import { useOwnDocument } from "@/lib/useOwnDocument";

export default function Home() {
  const { user, token, status, logout } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">CRDT Playground — Phase 5</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Real-time sync through Hocuspocus, persisted to Postgres, with live
          collaboration cursors. Log in as the same user in a second tab to
          see both cursors and the presence list update.
        </p>
      </div>

      {status === "loading" && (
        <p className="text-sm text-black/40 dark:text-white/40">Loading…</p>
      )}

      {status === "unauthenticated" && <AuthForm />}

      {status === "authenticated" && user && token && (
        <EditorArea userId={user.id} userName={user.name} token={token} onLogout={logout} />
      )}
    </main>
  );
}

function EditorArea({
  userId,
  userName,
  token,
  onLogout,
}: {
  userId: string;
  userName: string;
  token: string;
  onLogout: () => void;
}) {
  const { documentId, loading, error } = useOwnDocument(token);
  const provider = useHocuspocusProvider(documentId);

  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="text-black/60 dark:text-white/60">
          Signed in as <span className="font-medium">{userName}</span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-black/50 underline dark:text-white/50"
        >
          Log out
        </button>
      </div>

      {loading && (
        <p className="text-sm text-black/40 dark:text-white/40">Loading document…</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && documentId && provider && (
        <CollaborativeEditor
          provider={provider}
          label={`ws://localhost:1234`}
          user={{ id: userId, name: userName }}
        />
      )}
    </>
  );
}
