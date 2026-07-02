# Deployment

> **Chạy local để dev/test:** xem [LOCAL_DEV.md](../LOCAL_DEV.md) — hướng dẫn từng lệnh PowerShell, Docker stack, smoke test.

## Services

| Service | Image / build | Host port | Public |
| --- | --- | --- | --- |
| `idx-chat-user` | `apps/user-chat` Dockerfile | 3001 | Yes (auth-gated) |
| `idx-chat-admin` | `apps/admin` Dockerfile | 3002 | No / VPN |
| `idx-api` | `apps/idx-api` Dockerfile | 4000 | Internal (BFF + OAuth callback) |
| `mongo` | mongo:7 | 27017 | Internal |
| `gateway` | ModularRAG (existing) | 8030 | Internal |

Replaces `chatbot-ui` on port 3000 in E07. After E09, only `idx-api` holds ModularRAG URL and API keys.

## Docker Compose (root `docker-compose.yml`)

Dev compose runs `mongo`, `idx-api`, `idx-chat-user`, and `idx-chat-admin`. BFF apps use `IDX_API_URL` + `IDX_SERVICE_SECRET` — not gateway URL or keys.

```yaml
mongo:
  image: mongo:7
  ports:
    - "27017:27017"

idx-api:
  build:
    context: .
    dockerfile: apps/idx-api/Dockerfile
  environment:
    MONGODB_URI: mongodb://mongo:27017/idx_api
    JWT_SECRET: ${IDX_JWT_SECRET}
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    GOOGLE_CALLBACK_URL: http://localhost:4000/auth/google/callback
    FRONTEND_URL: ${IDX_FRONTEND_URL:-http://localhost:3001}
    MODULAR_RAG_GATEWAY_URL: http://host.docker.internal:8030
    USER_API_KEY: ${HUIT_USER_API_KEY}
    ADMIN_API_KEY: ${HUIT_ADMIN_API_KEY}
    IDX_SERVICE_SECRET: ${IDX_SERVICE_SECRET}
  ports:
    - "4000:4000"
  depends_on:
    mongo:
      condition: service_healthy
```

See `docker-compose.prod.yml` for production cutover (`idx-chat-user`, `idx-chat-admin`, `idx-api`, `mongo`). The production compose loads optional root `.env` and `.env.prod` files in that order, validates required secrets, and does not require Node.js or pnpm on the host.

## Environment Variables

### idx-api

| Variable | Required | Example |
| --- | --- | --- |
| `MONGODB_URI` | yes | `mongodb://localhost:27017/idx_api` |
| `JWT_SECRET` | yes | shared with user-chat BFF |
| `JWT_ACCESS_TTL` | no | `3600` |
| `JWT_REFRESH_TTL` | no | `604800` |
| `GOOGLE_CLIENT_ID` | E08 prod | from Google Console |
| `GOOGLE_CLIENT_SECRET` | E08 prod | from Google Console |
| `GOOGLE_CALLBACK_URL` | yes | `http://localhost:4000/auth/google/callback` |
| `FRONTEND_URL` | yes | `http://localhost:3001` |
| `MODULAR_RAG_GATEWAY_URL` | E09+ | `http://localhost:8030` |
| `USER_API_KEY` | E09+ | user gateway key |
| `ADMIN_API_KEY` | E09+ | admin gateway key |
| `IDX_SERVICE_SECRET` | E09+ | shared with BFF apps |

### user-chat

| Variable | Required | Example |
| --- | --- | --- |
| `IDX_API_URL` | yes | `http://idx-api:4000` |
| `IDX_SERVICE_SECRET` | yes | shared with idx-api |
| `TENANT_ID` | yes | `huit_admission_chatbot` |
| `DEFAULT_CORPUS_ID` | yes | `admission-chatbot-corpus` |
| `DEFAULT_CHAT_PIPELINE` | yes | `huit_chat_multi_query_prod` |
| `DEFAULT_VOICE_PIPELINE` | yes | `huit_voice_multi_query_prod` |
| `DEFAULT_TOP_K` | no | `5` |
| `JWT_SECRET` | E08+ | shared with idx-api, 32+ bytes |
| `AUTH_REQUIRED` | E02/E07 | `false` dev, `true` prod |
| `FRONTEND_URL` | E08+ | `http://localhost:3001` |

`AUTH_API_URL` is accepted as a backward-compatible alias for `IDX_API_URL`.

### admin

| Variable | Required | Example |
| --- | --- | --- |
| `IDX_API_URL` | yes | `http://idx-api:4000` |
| `IDX_SERVICE_SECRET` | yes | shared with idx-api |
| `ADMIN_IP_ALLOWLIST` | prod | `10.0.0.0/8,...` |
| `SESSION_SECRET` | yes | random |

## Local Development

```powershell
# Terminal 1 — ModularRAG stack
cd ModularRAG-platform; ./scripts/run/up_full.sh

# Terminal 2 — idx-api + mongo
cd assistant-ui; docker compose up -d mongo idx-api
pnpm --filter @idx/idx-api db:bootstrap

# Terminal 3 — user-chat
pnpm install; pnpm --filter @idx/user-chat dev
# http://localhost:3001  (AUTH_REQUIRED=false until E07)

# Terminal 4 — admin
pnpm --filter @idx/admin dev
# http://localhost:3002
```

Copy `.env.example` → `.env.local` per app. Gateway URL and keys belong in `apps/idx-api/.env` only.

## Health Checks

- user: `GET /api/health`
- admin: `GET /api/health`
- idx-api: `GET /health`, `GET /health/rag`
- mongo: `mongosh --eval "db.adminCommand('ping')"`

## Go-Live Phases

| Phase | Deploy | Auth |
| --- | --- | --- |
| 0 | Dev/staging only, demo key | None |
| 1 | HUIT prod user app | idx-api + email + Google (E08) |
| 1 | Admin VPN + staff SSO | `chat_admin` |
| 2 | + backend user conversation API | Full S1 mitigation |

See [security.md](./security.md) checklist.
