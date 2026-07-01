# user-chat — Next.js with standalone output (monorepo aware)
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# 1) Lockfiles + manifests only (good caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/user-chat/package.json ./apps/user-chat/
COPY packages/modular-rag-sdk/package.json ./packages/modular-rag-sdk/
COPY packages/voice-input/package.json ./packages/voice-input/
RUN pnpm install --frozen-lockfile --filter @idx/user-chat...

# 2) Copy sources and build
# Use placeholder envs during build; real values come from compose at runtime
COPY apps/user-chat ./apps/user-chat
COPY packages/modular-rag-sdk ./packages/modular-rag-sdk
COPY packages/voice-input ./packages/voice-input

ENV NEXT_TELEMETRY_DISABLED=1
ENV IDX_API_URL=http://idx-api:4000
ENV IDX_SERVICE_SECRET=build-placeholder
ENV JWT_SECRET=build-placeholder

RUN pnpm --filter @idx/user-chat build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Next.js standalone is self-contained
COPY --from=build /app/apps/user-chat/.next/standalone ./
COPY --from=build /app/apps/user-chat/.next/static ./apps/user-chat/.next/static

EXPOSE 3000
CMD ["node", "apps/user-chat/server.js"]