# admin — Next.js with standalone output (monorepo aware)
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# 1) Lockfiles + manifests only (good caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile --filter @idx/admin...

# 2) Copy sources and build
COPY apps/admin ./apps/admin

ENV NEXT_TELEMETRY_DISABLED=1
ENV MODULAR_RAG_GATEWAY_URL=http://host.docker.internal:8030
ENV ADMIN_API_KEY=build-placeholder
ENV BUILD_STANDALONE=1
ENV BUILD_STANDALONE=1

RUN pnpm --filter @idx/admin build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Next.js standalone is self-contained
COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
