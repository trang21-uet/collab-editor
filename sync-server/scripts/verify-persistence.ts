/**
 * Standalone end-to-end check for Phase 4 (Hocuspocus <-> Postgres persistence).
 * No browser or web/ wiring needed — talks to api (REST) and sync-server (WS) directly.
 *
 * Prereqs: docker compose up -d postgres && pnpm --dir api start:dev
 *          && pnpm --dir sync-server dev
 * Run:     pnpm --dir sync-server exec tsx scripts/verify-persistence.ts
 */
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { randomUUID } from "node:crypto";

const API_BASE = "http://localhost:3001";
const WS_URL = "ws://localhost:1234";
const MARKER = `persisted-at-${Date.now()}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const email = `verify-${Date.now()}@example.com`;

  console.log("=== 1. Register + login + create document via api ===");
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: "Verify Script", password: "pass1234" }),
  });
  if (!registerRes.ok) throw new Error(`register failed: ${registerRes.status}`);

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "pass1234" }),
  });
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
  const { accessToken } = (await loginRes.json()) as { accessToken: string };

  const docRes = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ title: "Persistence verification doc" }),
  });
  if (!docRes.ok) throw new Error(`create document failed: ${docRes.status}`);
  const { id: documentId } = (await docRes.json()) as { id: string };
  console.log(`Created document ${documentId}`);

  console.log("\n=== 2. Connection #1: write a marker, wait past debounce, disconnect ===");
  const provider1 = new HocuspocusProvider({ url: WS_URL, name: documentId });
  await new Promise<void>((resolve, reject) => {
    provider1.on("synced", () => resolve());
    setTimeout(() => reject(new Error("connection #1 never synced")), 5000);
  });
  provider1.document.getText("content").insert(0, MARKER);
  console.log("Wrote marker, waiting 3s for debounced save...");
  await sleep(3000);
  provider1.destroy();

  console.log("\n=== 3. Connection #2: fresh provider, same room, expect marker restored ===");
  const provider2 = new HocuspocusProvider({ url: WS_URL, name: documentId });
  await new Promise<void>((resolve, reject) => {
    provider2.on("synced", () => resolve());
    setTimeout(() => reject(new Error("connection #2 never synced")), 5000);
  });
  const restored = provider2.document.getText("content").toString();
  provider2.destroy();

  if (restored !== MARKER) {
    throw new Error(
      `FAIL: expected restored content to equal marker.\n  expected: ${MARKER}\n  actual:   ${restored}`,
    );
  }
  console.log(`PASS: content restored from Postgres ("${restored}")`);

  console.log("\n=== 4. Connection #3: unknown room name, expect rejection ===");
  const unknownId = randomUUID();
  const provider3 = new HocuspocusProvider({
    url: WS_URL,
    name: unknownId,
    maxAttempts: 1,
  });
  // A throw inside onLoadDocument surfaces client-side as "authenticationFailed"
  // (Hocuspocus treats a rejected load the same way as a rejected auth check), not as a
  // raw socket "close" — confirmed empirically, the client stays in "connected" status.
  const rejected = await new Promise<boolean>((resolve) => {
    provider3.on("synced", () => resolve(false));
    provider3.on("authenticationFailed", () => resolve(true));
    setTimeout(() => resolve(false), 5000);
  });
  provider3.destroy();

  if (!rejected) {
    throw new Error("FAIL: connection with an unknown document id was not rejected");
  }
  console.log("PASS: connection with an unknown document id was rejected");

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
