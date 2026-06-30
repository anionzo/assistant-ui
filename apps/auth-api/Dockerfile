# auth-api — clean multi-stage build for monorepo
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

# 1) Only lockfiles + workspace manifests for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/auth-api/package.json ./apps/auth-api/
RUN pnpm install --frozen-lockfile --filter @idx/auth-api

# 2) Copy source, build, then prune to production dependencies only
COPY apps/auth-api ./apps/auth-api
RUN pnpm --filter @idx/auth-api build \
  && pnpm prune --prod --filter @idx/auth-api

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only what's needed at runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/auth-api/dist ./apps/auth-api/dist
COPY --from=build /app/apps/auth-api/drizzle ./apps/auth-api/drizzle

EXPOSE 4000

# Run migrations then start server
CMD ["sh", "-c", "node apps/auth-api/dist/db/migrate.js && node apps/auth-api/dist/index.js"]