#!/bin/sh
set -e

# api is the sole owner of migrations (sync-server's schema is never migrated — see
# CLAUDE.md). Running this here is fine for a single api instance/replica; it would
# race across multiple replicas, which this project's compose setup doesn't have.
./node_modules/.bin/prisma migrate deploy

# nest build preserves the src/ layout under dist/ (rootDir: src, outDir: dist), so
# the real entry point is dist/src/main.js, not dist/main.js — package.json's own
# start:prod script had this same stale path, fixed alongside this.
exec node dist/src/main
