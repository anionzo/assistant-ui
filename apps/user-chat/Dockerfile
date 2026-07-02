# user-chat — Next.js standalone (production)
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/user-chat/package.json ./apps/user-chat/
COPY packages/modular-rag-sdk/package.json ./packages/modular-rag-sdk/
COPY packages/voice-input/package.json ./packages/voice-input/
COPY packages/i18n/package.json ./packages/i18n/
RUN pnpm install --frozen-lockfile --filter @idx/user-chat... --ignore-scripts

COPY apps/user-chat ./apps/user-chat
COPY packages/modular-rag-sdk ./packages/modular-rag-sdk
COPY packages/voice-input ./packages/voice-input
COPY packages/i18n ./packages/i18n

ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1

RUN pnpm --filter @idx/user-chat build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/user-chat/.next/standalone ./
COPY --from=build /app/apps/user-chat/.next/static ./apps/user-chat/.next/static

EXPOSE 3000
CMD ["node", "apps/user-chat/server.js"]
