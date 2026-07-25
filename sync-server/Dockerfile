FROM node:24-alpine AS deps
WORKDIR /app
# Not `corepack enable`: corepack's own shim strictly validates package.json's
# devEngines.packageManager and rejects its "^11.16.0" range (it wants an exact
# version) — a pnpm installed directly like this doesn't do that check, matching how
# the host's own pnpm (installed outside corepack) already behaves.
RUN npm install -g pnpm@11.16.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@11.16.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder is enough — prisma generate validates the datasource url is present but
# doesn't connect (same Prisma 7 gotcha as api's Dockerfile).
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S hocuspocus -G nodejs

# sync-server's schema is never migrated (see CLAUDE.md) — no prisma/ dir needed at
# runtime, just the generated client already inside node_modules.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN chown -R hocuspocus:nodejs /app

USER hocuspocus
EXPOSE 1234
CMD ["node", "dist/server.js"]
