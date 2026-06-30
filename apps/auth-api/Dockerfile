FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/auth-api/package.json ./apps/auth-api/
RUN pnpm install --frozen-lockfile --filter @idx/auth-api

COPY apps/auth-api ./apps/auth-api
RUN pnpm --filter @idx/auth-api build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-api/package.json ./apps/auth-api/
RUN pnpm install --frozen-lockfile --filter @idx/auth-api --prod --no-optional

COPY --from=build /app/apps/auth-api/dist ./apps/auth-api/dist
COPY --from=build /app/apps/auth-api/drizzle ./apps/auth-api/drizzle

EXPOSE 4000
CMD ["sh", "-c", "node apps/auth-api/dist/db/migrate.js && node apps/auth-api/dist/index.js"]
