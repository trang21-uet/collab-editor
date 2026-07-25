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
# prisma generate validates the datasource url is present even though it doesn't
# connect anywhere at generate time — a placeholder is enough (Prisma 7 gotcha, see
# CLAUDE.md).
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Reusing the builder's node_modules wholesale (rather than a separate --prod install
# stage) keeps this simple and guarantees the generated Prisma client is present —
# the trade-off is devDependencies riding along in the image too, acceptable for this
# project's scope.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
