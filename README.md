# Idx Chat

> AI-powered document Q&A chatbot — upload tài liệu, chat, có dẫn nguồn.

**Idx Chat** là chatbot GPT-style trả lời câu hỏi dựa trên tài liệu được upload bằng RAG (Retrieval-Augmented Generation). Admin upload file (.docx, .pdf, .xlsx, .csv) → index → publish, người dùng chat và nhận câu trả lời có trích dẫn chính xác từ tài liệu gốc.

Xây dựng trên [assistant-ui.com](https://www.assistant-ui.com/) UI primitives + Next.js 15, **idx-api** (auth + central RAG gateway), ModularRAG upstream, **MongoDB**.

## Ai dùng gì

| Surface | User | Chức năng |
|---------|------|-----------|
| `:3001` | Sinh viên / public | Chat + Google/email login + voice input |
| `:3002` | Admin / operator | Upload tài liệu → index → publish corpus |
| `:4000` | Internal | **idx-api** — auth, RBAC, RAG gateway boundary |

Cả `user-chat` và `admin` hỗ trợ **i18n vi/en** (`@idx/i18n`, cookie `idx_locale`).

## Kiến trúc

```text
Browser (user-chat :3001) ──→ BFF /api/chat/* ──→ idx-api /rag/* ──→ ModularRAG :8030
Browser (admin :3002)     ──→ BFF /api/documents/* ──→ idx-api /rag/admin/* ──→ ModularRAG
       │                         │
       └──── idx-api :4000 ──────┘  (JWT, Google OAuth, RBAC, gateway keys)
                    │
              MongoDB (idx_api)
```

Frontend apps **không** chứa `MODULAR_RAG_GATEWAY_URL` hay API keys — chỉ `IDX_API_URL` + `IDX_SERVICE_SECRET`.

### Apps

| App | Stack | Port |
|-----|-------|------|
| `apps/user-chat` | Next.js 15 | 3001 |
| `apps/admin` | Next.js 15 | 3002 |
| `apps/idx-api` | Hono + MongoDB driver | 4000 |

## Cấu trúc monorepo

```text
assistant-ui/
├── apps/                 # user-chat, admin, idx-api
├── packages/             # modular-rag-sdk, voice-input, i18n (@idx/*)
├── scripts/dev/          # e2e smoke, mock gateway
├── docker-compose.yml
└── docker-compose.prod.yml
```

| Thư mục | Mục đích |
|---------|----------|
| `apps/` | Ứng dụng deploy / `pnpm dev` |
| `packages/` | Thư viện dùng chung (SSE parser, voice UI, i18n) |

## Yêu cầu

- Node.js 20+
- pnpm 11 (`corepack enable`)
- Docker Desktop (khuyên dùng cho stack đầy đủ)
- Tuỳ chọn: ModularRAG gateway tại `http://localhost:8030` (chat RAG thật)

## Chạy local

### Bước 1 — Cài dependency & env

```powershell
pnpm install

Copy-Item apps\idx-api\.env.example apps\idx-api\.env
Copy-Item apps\user-chat\.env.example apps\user-chat\.env.local
Copy-Item apps\admin\.env.example apps\admin\.env.local
```

`IDX_SERVICE_SECRET` phải **giống nhau** ở cả 3 file env.

### Bước 2 — Docker stack (khuyên dùng)

```powershell
pnpm dev:stack      # mongo + idx-api + user-chat + admin
```

| URL | Service |
|-----|---------|
| http://localhost:3001 | User chat |
| http://localhost:3002 | Admin |
| http://localhost:4000 | idx-api |
| http://localhost:27017 | MongoDB |

```powershell
pnpm dev:stack:logs    # xem log
pnpm dev:stack:down    # tắt stack
pnpm test:e2e          # smoke (stack đang chạy)
```

### Bước 3 — Native (tuỳ chọn)

```powershell
docker compose up -d mongo
pnpm --filter @idx/idx-api db:bootstrap
pnpm --filter @idx/idx-api dev    # :4000
pnpm dev                          # user-chat :3001
pnpm dev:admin                    # admin :3002
```

### Admin đầu tiên (tuỳ chọn)

1. Set `ADMIN_SEED_EMAIL=admin@huit.edu.vn` trong `apps/idx-api/.env`
2. Đăng ký bằng email đó (user-chat)
3. idx-api tự gán role `super_admin`

### Chat RAG thật (tuỳ chọn)

Trong `apps/idx-api/.env`:

```env
MODULAR_RAG_GATEWAY_URL=http://localhost:8030
USER_API_KEY=demo-api-key
ADMIN_API_KEY=demo-admin-key
```

## RBAC

| Role | ID | Quyền |
|------|----|-------|
| super_admin | 1 | Toàn bộ |
| admin | 2 | Collections, documents, files, forms |
| operator | 3 | Upload, index, publish |
| viewer | 4 | Read-only |
| user | 5 | Chat only |

## Validation

```powershell
pnpm --filter @idx/idx-api typecheck
pnpm --filter @idx/user-chat typecheck
pnpm --filter @idx/admin typecheck
pnpm --filter @idx/idx-api test
pnpm --filter @idx/user-chat test
pnpm --filter @idx/admin test
```

## Production

```powershell
docker compose -f docker-compose.prod.yml up -d --build
```

Biến bắt buộc: `IDX_JWT_SECRET`, `IDX_SERVICE_SECRET`, `USER_API_KEY`, `ADMIN_API_KEY` — xem `.env.prod.example`.