# admin — Next.js standalone (production)
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/i18n/package.json ./packages/i18n/
RUN pnpm install --frozen-lockfile --filter @idx/admin... --ignore-scripts

COPY apps/admin ./apps/admin
COPY packages/i18n ./packages/i18n

ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1

RUN pnpm --filter @idx/admin build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3002
CMD ["node", "apps/admin/server.js"]
