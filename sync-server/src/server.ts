import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const port = Number(process.env.PORT ?? 1234);

const server = new Server({
  port,
  extensions: [new Logger()],
  // Persistence (onStoreDocument / onLoadDocument via Prisma) lands in Phase 4 —
  // for now Hocuspocus just merges Yjs updates in memory and broadcasts them.
});

server.listen();
