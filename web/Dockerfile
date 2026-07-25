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

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read at
# runtime — must be supplied as build args (see docker-compose.yml's build.args).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SYNC_SERVER_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SYNC_SERVER_URL=$NEXT_PUBLIC_SYNC_SERVER_URL

RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# output: "standalone" (next.config.ts) traces only the files server.js actually needs,
# so the runtime image doesn't carry node_modules or source at all.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
