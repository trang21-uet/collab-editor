"use client";

import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";

const SYNC_SERVER_URL =
  process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? "ws://localhost:1234";

export function useHocuspocusProvider(documentName: string) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    const instance = new HocuspocusProvider({
      url: SYNC_SERVER_URL,
      name: documentName,
    });
    setProvider(instance);

    return () => {
      instance.destroy();
    };
  }, [documentName]);

  return provider;
}
