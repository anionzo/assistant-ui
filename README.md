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

## Cấu trúc thư mục

Monorepo **pnpm** + **Turborepo**: apps chạy được, packages là thư viện dùng chung.

```text
assistant-ui/
├── apps/                 # user-chat, admin, idx-api
├── packages/             # modular-rag-sdk, voice-input (@idx/*)
├── docs/                 # Harness + product docs
├── scripts/              # harness-cli, e2e smoke
└── node_modules/         # dependency (pnpm) — không sửa tay
```

| Thư mục | Làm gì |
|---------|--------|
| `apps/` | Ứng dụng deploy / `pnpm dev` |
| `packages/` | Code share giữa apps (SSE parser, voice UI) |
| `node_modules/` | Thư viện bên thứ 3 — sinh ra từ `pnpm install` |
| `terminals/`, `agent-tools/` | Artifact agent/IDE — xóa được, đã gitignore |

Chi tiết từng thư mục con, file nào xóa được: **[docs/REPO_LAYOUT.md](docs/REPO_LAYOUT.md)**.

## Chạy local

Hướng dẫn đầy đủ: **[docs/LOCAL_DEV.md](docs/LOCAL_DEV.md)** (setup env, Docker stack, native, test).

```powershell
pnpm install
Copy-Item apps\idx-api\.env.example apps\idx-api\.env
Copy-Item apps\user-chat\.env.example apps\user-chat\.env.local
Copy-Item apps\admin\.env.example apps\admin\.env.local
# Đồng bộ IDX_SERVICE_SECRET giữa 3 file env

pnpm dev:stack      # Docker: mongo + idx-api + user-chat + admin
pnpm test:e2e       # smoke (cần stack đang chạy)
```

Native từng app: `pnpm --filter @idx/idx-api dev` → `:4000`, `pnpm dev` → `:3001`, `pnpm dev:admin` → `:3002`.

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

- [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) — **chạy local & test**
- [docs/DOC_MAP.md](docs/DOC_MAP.md) — đọc trước khi code
- [docs/REPO_LAYOUT.md](docs/REPO_LAYOUT.md) — giải thích từng thư mục trong repo
- [docs/stories/backlog.md](docs/stories/backlog.md)
- [docs/decisions/0022-central-idx-api-gateway.md](docs/decisions/0022-central-idx-api-gateway.md)