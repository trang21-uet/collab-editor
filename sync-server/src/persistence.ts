import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { encodeStateAsUpdate } from "yjs";
import type {
  onLoadDocumentPayload,
  onStoreDocumentPayload,
} from "@hocuspocus/server";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — check sync-server/.env");
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * onLoadDocument runs once per document, the first time it's opened in this process
 * (later connections to an already-loaded doc join the in-memory copy directly — this
 * hook does not re-run per connection).
 *
 * documentName is the Hocuspocus "room name". By design it is always a real Document.id,
 * created beforehand via api's POST /documents — the frontend doesn't wire a real id in
 * as the room name until a later dashboard phase, but the persistence contract is built
 * for that flow now. We reject unknown room names by throwing: DocumentSnapshot.documentId
 * has a required FK to Document(id) (onDelete: Cascade), so letting an arbitrary name
 * through would only surface as an FK violation later, on the first debounced save,
 * instead of failing fast at connection time. Throwing here closes the connection and
 * discards the speculative in-memory Y.Doc Hocuspocus already created for it.
 */
export async function loadDocument({
  documentName,
}: onLoadDocumentPayload): Promise<Uint8Array | undefined> {
  const document = await prisma.document.findUnique({
    where: { id: documentName },
    select: {
      snapshots: {
        orderBy: { version: "desc" },
        take: 1,
        select: { ydocState: true },
      },
    },
  });

  if (!document) {
    throw new Error(
      `Refusing to load document "${documentName}": no matching Document row. ` +
        `Create it via POST /documents first.`,
    );
  }

  // Brand-new document with no snapshots yet: return nothing so Hocuspocus keeps the
  // empty Y.Doc it already created.
  return document.snapshots[0]?.ydocState;
}

/**
 * onStoreDocument runs on a debounced timer (see debounce/maxDebounce in server.ts) after
 * any change, and once more on unload. Hocuspocus already serializes calls to this hook
 * per document within a process (it wraps the call in an internal per-document mutex), so
 * the read-then-write below is race-free for a single sync-server instance. It is NOT
 * race-free across multiple instances (Phase 7's planned Redis-based horizontal scaling)
 * — that would need a DB-level guarantee (e.g. a sequence) instead of max(version)+1.
 * Accepted trade-off for this phase.
 *
 * Append-only by design: every debounced save is a new row, never an overwrite. Sets up
 * Phase 7's version-history feature; the accepted trade-off is unbounded row growth with
 * no pruning yet.
 */
export async function storeDocument({
  documentName,
  document,
}: onStoreDocumentPayload): Promise<void> {
  const ydocState = Buffer.from(encodeStateAsUpdate(document));

  const latest = await prisma.documentSnapshot.aggregate({
    where: { documentId: documentName },
    _max: { version: true },
  });
  const nextVersion = (latest._max.version ?? 0) + 1;

  await prisma.documentSnapshot.create({
    data: { documentId: documentName, ydocState, version: nextVersion },
  });
}
