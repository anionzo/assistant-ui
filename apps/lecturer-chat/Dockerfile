# lecturer-chat — Next.js standalone (production) — clone of user-chat for lecturers
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/lecturer-chat/package.json ./apps/lecturer-chat/
COPY packages/modular-rag-sdk/package.json ./packages/modular-rag-sdk/
COPY packages/voice-input/package.json ./packages/voice-input/
COPY packages/i18n/package.json ./packages/i18n/
RUN pnpm install --frozen-lockfile --filter @idx/lecturer-chat... --ignore-scripts

COPY apps/lecturer-chat ./apps/lecturer-chat
COPY packages/modular-rag-sdk ./packages/modular-rag-sdk
COPY packages/voice-input ./packages/voice-input
COPY packages/i18n ./packages/i18n

ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1

RUN pnpm --filter @idx/lecturer-chat build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/lecturer-chat/.next/standalone ./
COPY --from=build /app/apps/lecturer-chat/.next/static ./apps/lecturer-chat/.next/static
COPY --from=build /app/apps/lecturer-chat/public ./apps/lecturer-chat/public

EXPOSE 3000
CMD ["node", "apps/lecturer-chat/server.js"]
