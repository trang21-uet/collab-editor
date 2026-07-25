import type { IncomingMessage, ServerResponse } from "node:http";
import type { Hocuspocus } from "@hocuspocus/server";
import { restoreVersion, VersionNotFoundError } from "./restore.js";

const internalSecret = process.env.INTERNAL_SECRET;
if (!internalSecret) {
  throw new Error("INTERNAL_SECRET is not set — check sync-server/.env");
}

const RESTORE_PATH = /^\/internal\/documents\/([^/]+)\/restore$/;
const MAX_BODY_BYTES = 10_000;

/**
 * Hocuspocus's own request handler (see @hocuspocus/server@4.4's compiled
 * Server#requestHandler) always writes a fallback "Welcome to Hocuspocus!" response
 * after onRequest hooks run, *unless* the hooks chain rejects — and even then, it
 * only rethrows the rejection reason if it's truthy (`if (error) throw error`), which
 * would otherwise surface as an unhandled promise rejection and crash the process on
 * modern Node. So once we've fully written our own response for a matched internal
 * route, we intentionally reject with `undefined` to short-circuit that fallback
 * write cleanly instead of letting it also try to write to an already-ended response.
 * There's no documented public API for "I handled this request" — re-verify this
 * against the compiled source if @hocuspocus/server is ever upgraded.
 */
function markHandled(): never {
  throw undefined;
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function respondJson(response: ServerResponse, status: number, body: unknown): never {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
  markHandled();
}

/**
 * Handles sync-server's internal HTTP surface (currently just version restore, called
 * by api — never by browsers directly). Any request whose path doesn't match one of
 * these routes is left untouched so Hocuspocus's normal handling (its own
 * "Welcome to Hocuspocus!" response for plain GETs) still applies.
 */
export async function handleInternalRequest(
  request: IncomingMessage,
  response: ServerResponse,
  instance: Hocuspocus,
): Promise<void> {
  const url = request.url ?? "";
  const restoreMatch = url.match(RESTORE_PATH);
  if (!restoreMatch) return;

  const documentId = decodeURIComponent(restoreMatch[1]);

  if (request.method !== "POST") {
    respondJson(response, 405, { message: "Method not allowed" });
  }

  // Shared-secret check: this endpoint is reachable on the same port browsers connect
  // to over WebSocket, so it must not trust the caller's identity — only api knows
  // this secret and does its own per-user role check before ever calling here.
  if (request.headers["x-internal-secret"] !== internalSecret) {
    respondJson(response, 401, { message: "Unauthorized" });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    respondJson(response, 400, {
      message: error instanceof Error ? error.message : "Invalid request body",
    });
  }

  const version = (body as { version?: unknown } | undefined)?.version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    respondJson(response, 400, { message: "version must be an integer" });
  }

  // respondJson always throws once it's written a response (see its own comment) — so
  // the success call below must sit outside this try/catch. Calling it inside would
  // have its own throw land right back in the catch clause and try to write a second
  // response on top of the first, crashing the process with ERR_HTTP_HEADERS_SENT.
  try {
    await restoreVersion(instance, documentId, version as number);
  } catch (error) {
    if (error instanceof VersionNotFoundError) {
      respondJson(response, 404, { message: error.message });
    }
    respondJson(response, 500, {
      message: error instanceof Error ? error.message : "Restore failed",
    });
  }
  respondJson(response, 200, { ok: true });
}
