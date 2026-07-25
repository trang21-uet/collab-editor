"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

// Redirects to the login page once auth status resolves to unauthenticated.
// Callers still branch on status === "loading" for their own loading UI.
export function useRequireAuth() {
  const { user, token, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  return { user, token, status, logout };
}
