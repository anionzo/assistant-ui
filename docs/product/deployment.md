# Deployment

> **Chạy local để dev/test:** xem [LOCAL_DEV.md](../LOCAL_DEV.md) — hướng dẫn từng lệnh PowerShell, Docker stack, smoke test.

## Services

| Service | Image / build | Host port | Public |
| --- | --- | --- | --- |
| `idx-chat-user` | `apps/user-chat` Dockerfile | 3001 | Yes (auth-gated) |
| `idx-chat-admin` | `apps/admin` Dockerfile | 3002 | No / VPN |
| `idx-api` | `apps/idx-api` Dockerfile | 4000 | Internal (BFF + OAuth callback) |
| `mongo` (local dev only) | `docker-compose.db.yml` | 27017 | Internal |
| `gateway` | ModularRAG (existing) | 8030 | Internal |

Replaces `chatbot-ui` on port 3000 in E07. After E09, only `idx-api` holds ModularRAG URL and API keys.

## Docker Compose (root `docker-compose.yml`)

`docker-compose.yml` runs `idx-chat-user`, `idx-chat-admin`, and `idx-api` only. MongoDB is external in production (`MONGODB_URI` in root `.env`). Local dev may use `docker-compose.db.yml` (`pnpm stack:db`). See [scripts/ops/MONGO_RUNBOOK.md](../../scripts/ops/MONGO_RUNBOOK.md).

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
| `IDX_API_URL` | yes | `http://localhost:4000` locally; public API domain when deployed |
| `IDX_SERVICE_SECRET` | yes | shared with idx-api |
| `TENANT_ID` | yes | `huit_admission_chatbot` |
| `DEFAULT_CORPUS_ID` | yes | `admission-chatbot-corpus` |
| `DEFAULT_CHAT_PIPELINE` | yes | `huit_chat_multi_query_prod` |
| `DEFAULT_VOICE_PIPELINE` | yes | `huit_voice_multi_query_prod` |
| `DEFAULT_TOP_K` | no | `5` |
| `JWT_SECRET` | E08+ | shared with idx-api, 32+ bytes |
| `AUTH_REQUIRED` | E02/E07 | `false` dev, `true` prod |
| `FRONTEND_URL` | E08+ | `http://localhost:3001` |

`IDX_API_URL` is required; the BFF does not synthesize a default endpoint or accept a legacy alias.

`IDX_API_URL` is the browser-reachable auth endpoint (`http://localhost:4000` locally or the deployed API domain). Compose injects `IDX_API_INTERNAL_URL=http://idx-api:4000` only for server-to-server requests inside Docker.

### admin

| Variable | Required | Example |
| --- | --- | --- |
| `IDX_API_URL` | yes | `http://localhost:4000` locally; public API domain when deployed |
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

Copy `.env.example` → root `.env`. Docker Compose reads it directly. For native app processes, run `pnpm setup:env` to generate the app-local files. Gateway URL and keys are passed only to `idx-api` at runtime; frontend code does not consume them.

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
