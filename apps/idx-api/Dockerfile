FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/idx-api/package.json ./apps/idx-api/
RUN pnpm install --frozen-lockfile --filter @idx/idx-api

COPY apps/idx-api ./apps/idx-api
RUN pnpm --filter @idx/idx-api build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/idx-api/package.json ./apps/idx-api/
RUN pnpm install --frozen-lockfile --filter @idx/idx-api --prod --no-optional

COPY --from=build /app/apps/idx-api/dist ./apps/idx-api/dist
EXPOSE 4000
CMD ["sh", "-c", "node apps/idx-api/dist/db/bootstrap.js && node apps/idx-api/dist/index.js"]