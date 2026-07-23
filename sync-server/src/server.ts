import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";
import { loadDocument, storeDocument } from "./persistence.js";

const port = Number(process.env.PORT ?? 1234);

const server = new Server({
  port,
  extensions: [new Logger()],
  // Debounce onStoreDocument so rapid keystrokes don't hit Postgres on every Yjs update:
  // wait 2s after the last change, but never go longer than 10s without a save even under
  // continuous typing.
  debounce: 2000,
  maxDebounce: 10000,
  onLoadDocument: loadDocument,
  onStoreDocument: storeDocument,
});

server.listen();
