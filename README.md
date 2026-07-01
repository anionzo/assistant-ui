# Idx Chat

> AI-powered document Q&A chatbot — upload tài liệu, chat, có dẫn nguồn.

**Idx Chat** là chatbot GPT-style trả lời câu hỏi dựa trên tài liệu được upload bằng RAG (Retrieval-Augmented Generation). Admin upload file (.docx, .pdf, .xlsx, .csv) → index → publish, người dùng chat và nhận câu trả lời có trích dẫn chính xác từ tài liệu gốc.

Xây dựng trên [assistant-ui.com](https://www.assistant-ui.com/) UI primitives + Next.js 15, **idx-api** (auth + central RAG gateway), [ModularRAG](https://github.com/) upstream, PostgreSQL.

## Ai dùng gì

| Surface | User | Chức năng |
|---------|------|-----------|
| `:3001` | Sinh viên / public | Chat + Google login + voice input |
| `:3002` | Admin / operator | Upload tài liệu → index → publish corpus |
| `:4000` | Internal | **idx-api** — auth, RBAC, RAG gateway boundary |

## Kiến trúc (E09)

```text
Browser (user-chat :3001) ──→ BFF /api/chat/* ──→ idx-api /rag/* ──→ ModularRAG :8030
Browser (admin :3002)     ──→ BFF /api/documents/* ──→ idx-api /rag/admin/* ──→ ModularRAG
       │                         │
       └──── idx-api :4000 ──────┘  (JWT, Google OAuth, RBAC, gateway keys)
                    │
              PostgreSQL
```

Frontend apps **không** chứa `MODULAR_RAG_GATEWAY_URL` hay API keys — chỉ `IDX_API_URL` + `IDX_SERVICE_SECRET`.

### Apps

| App | Stack | Port |
|-----|-------|------|
| `apps/user-chat` | Next.js 15 | 3001 |
| `apps/admin` | Next.js 15 | 3002 |
| `apps/idx-api` | Hono + Drizzle ORM | 4000 |

## Chạy local

### 1. Idx API

```powershell
Copy-Item .env.example apps/idx-api/.env
# Thêm MODULAR_RAG_GATEWAY_URL, USER_API_KEY, ADMIN_API_KEY, IDX_SERVICE_SECRET vào apps/idx-api/.env
pnpm --filter @idx/idx-api db:migrate
pnpm --filter @idx/idx-api dev          # :4000
```

### 2. User Chat

```powershell
Copy-Item apps/user-chat/.env.example apps/user-chat/.env.local
pnpm --filter @idx/user-chat dev         # :3001
```

### 3. Admin

```powershell
Copy-Item apps/admin/.env.example apps/admin/.env.local
pnpm --filter @idx/admin dev             # :3002
```

### Tạo admin đầu tiên

1. Set `ADMIN_SEED_EMAIL=admin@huit.edu.vn` trong `apps/idx-api/.env`
2. Đăng ký tài khoản bằng email đó (qua user-chat hoặc Google OAuth)
3. idx-api tự động gán role `super_admin`

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

## Docs

- [docs/DOC_MAP.md](docs/DOC_MAP.md)
- [docs/stories/backlog.md](docs/stories/backlog.md)
- [docs/decisions/0022-central-idx-api-gateway.md](docs/decisions/0022-central-idx-api-gateway.md)