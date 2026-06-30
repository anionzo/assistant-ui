# Idx Chat

> AI-powered document Q&A chatbot — upload tài liệu, chat, có dẫn nguồn.

**Idx Chat** là chatbot GPT-style trả lời câu hỏi dựa trên tài liệu được upload bằng RAG (Retrieval-Augmented Generation). Admin upload file (.docx, .pdf, .xlsx, .csv) → index → publish, người dùng chat và nhận câu trả lời có trích dẫn chính xác từ tài liệu gốc.

Ví dụ: tuyển sinh, pháp luật, nội quy, hướng dẫn sử dụng, FAQ doanh nghiệp... cứ có tài liệu là chat được.

Xây dựng trên [assistant-ui.com](https://www.assistant-ui.com/) UI primitives + Next.js 15, backend [ModularRAG](https://github.com/) (document indexing + retrieval gateway), PostgreSQL (user auth + chat history).

## Ai dùng gì

| Surface | User | Chức năng |
|---------|------|-----------|
| `:3001` | Sinh viên / public | Chat + Google login + voice input |
| `:3002` | Admin / operator | Upload tài liệu → index → publish corpus → chat cập nhật ngay |
| `:4000` | Internal | Auth API (JWT, Google OAuth, RBAC) |

## Kiến trúc

```text
Browser (user-chat :3001) ──→ BFF /api/chat/* ──→ ModularRAG Gateway :8030 (SSE, RAG)
                                    │
Browser (admin :3002) ──→ BFF /api/documents/* ──→ Gateway :8030 (collections, upload, publish)
       │                        │
       └──── auth-api :4000 ────┘  (JWT, Google OAuth, RBAC roles + permissions)
                    │
              PostgreSQL (users, threads, messages, roles, permissions)
```

### Apps

| App | Stack | Port |
|-----|-------|------|
| `apps/user-chat` | Next.js 15 | 3001 |
| `apps/admin` | Next.js 15 | 3002 |
| `apps/auth-api` | Hono + Drizzle ORM | 4000 |

### Packages

| Package | Mô tả |
|---------|-------|
| `packages/modular-rag-sdk` | Gateway client + SSE stream parser |
| `packages/voice-input` | Shared voice recording UI component |

## Chạy local

### 1. Auth API

```powershell
Copy-Item .env.example apps/auth-api/.env
pnpm --filter @idx/auth-api db:migrate
pnpm --filter @idx/auth-api dev          # :4000
```

### 2. User Chat

```powershell
Copy-Item .env.example apps/user-chat/.env.local
pnpm --filter @idx/user-chat dev         # :3001
```

### 3. Admin

```powershell
Copy-Item .env.example apps/admin/.env.local
pnpm --filter @idx/admin dev             # :3002
```

### Tạo admin đầu tiên

1. Set `ADMIN_SEED_EMAIL=admin@huit.edu.vn` trong `apps/auth-api/.env`
2. Đăng ký tài khoản bằng email đó (qua user-chat `/auth/register` hoặc Google OAuth)
3. Auth-api tự động gán role `super_admin` → login admin bằng email đó

## RBAC — Phân quyền

| Role | ID | Quyền |
|------|----|-------|
| super_admin | 1 | Toàn bộ (gồm quản lý users + gán role) |
| admin | 2 | Quản lý collections, documents, files, forms |
| operator | 3 | Upload, index, publish documents; xem forms |
| viewer | 4 | Chỉ xem (read-only toàn bộ) |
| user | 5 | Chat user thường (không vào admin) |

Permissions (ID cố định): `10-14` collections, `20-23` documents, `30-32` files, `40-43` forms, `50-53` users.

## Validation

```powershell
pnpm --filter @idx/modular-rag-sdk typecheck
pnpm --filter @idx/user-chat typecheck
pnpm --filter @idx/admin typecheck
pnpm --filter @idx/auth-api typecheck
pnpm --filter @idx/modular-rag-sdk test
pnpm --filter @idx/user-chat test
pnpm --filter @idx/auth-api test
pnpm --filter @idx/user-chat build
```

## Docs

- [docs/DOC_MAP.md](docs/DOC_MAP.md) — đọc trước khi code
- [docs/product/](docs/product/) — product contract (15 files)
- [docs/stories/backlog.md](docs/stories/backlog.md) — epics E01–E08
- [docs/decisions/](docs/decisions/) — kiến trúc decisions (0008–0021)
