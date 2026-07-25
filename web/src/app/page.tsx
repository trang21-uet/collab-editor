"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/AuthProvider";

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">CRDT Playground</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Real-time sync through Hocuspocus, persisted to Postgres, with live
          collaboration cursors and document sharing.
        </p>
      </div>

      {status === "loading" && (
        <p className="text-sm text-black/40 dark:text-white/40">Loading…</p>
      )}

      {status === "unauthenticated" && <AuthForm />}
    </main>
  );
}
