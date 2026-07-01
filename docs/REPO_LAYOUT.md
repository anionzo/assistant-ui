# Repo Layout — Idx Chat (`assistant-ui`)

**Một trang giải thích mỗi thư mục trong monorepo.** Đọc trước khi dọn file hoặc đổi cấu trúc.

## Tổng quan

```text
assistant-ui/                    # Repo root (Harness + Idx Chat product)
├── apps/                        # Ứng dụng chạy được (deploy / dev)
├── packages/                    # Thư viện nội bộ dùng chung giữa apps
├── docs/                        # Harness + product docs (local instance)
├── scripts/                     # Harness CLI, schema, dev smoke scripts
├── node_modules/                # Dependency đã cài (pnpm) — KHÔNG sửa tay
├── docker-compose*.yml          # Stack dev / prod
├── package.json                 # Root workspace (`idx-chat`)
├── pnpm-workspace.yaml          # Khai báo apps/* + packages/*
├── pnpm-lock.yaml               # Lockfile — commit khi đổi dependency
├── turbo.json                   # Turborepo task graph
└── tsconfig.base.json           # TS config dùng chung
```

| Thư mục | Commit git? | Ai tạo? | Xóa được? |
| --- | --- | --- | --- |
| `apps/`, `packages/` | Có | Dev | **Không** — source chính |
| `scripts/` (trừ `bin/`) | Có | Harness | **Không** |
| `docs/` | Hầu hết local* | Harness installer | Cẩn thận — có exception tracked |
| `node_modules/` | Không | `pnpm install` | Có — chạy lại `pnpm install` |
| `.next/` | Không | `next build` / `next dev` | Có |
| `terminals/`, `agent-tools/`, `mcps/` | Không | Agent / IDE | Có — artifact runtime |
| `harness.db` | Không | `harness-cli init` | Có — tái tạo bằng CLI |
| `.pnpm-store/` | Không | pnpm (lỗi cấu hình) | Có — store nên ở ngoài repo |

\* Git chỉ track một số file docs cố định: `docs/DOC_MAP.md`, `docs/stories/backlog.md`. Phần còn lại là Harness local (`.gitignore`).

---

## `apps/` — Product surfaces

Mỗi app là một workspace package `@idx/*`, có `package.json` riêng.

| App | Package | Port | Vai trò |
| --- | --- | --- | --- |
| `apps/user-chat` | `@idx/user-chat` | 3001 | Chat UI end-user (assistant-ui + voice) |
| `apps/admin` | `@idx/admin` | 3002 | Operator: corpus, users, roles, forms |
| `apps/idx-api` | `@idx/idx-api` | 4000 | Auth, RBAC, central RAG gateway boundary |

### `apps/user-chat/`

```text
app/              # Next.js 15 App Router — pages, layouts, API routes (/api/*)
components/       # UI components (thread, auth shell, shadcn)
lib/              # Adapters, auth client, thread persistence, server config
hooks/            # React hooks
pages/            # Pages Router tối thiểu (_app, _document, 404) — giữ nếu chưa migrate hết
tests/            # Vitest unit/integration
```

**Phụ thuộc workspace:** `@idx/modular-rag-sdk`, `@idx/voice-input`.

**Env:** `apps/user-chat/.env.local` (copy từ `.env.example`). Chỉ `IDX_API_URL` + `IDX_SERVICE_SECRET` — không gateway key.

### `apps/admin/`

```text
app/              # Next.js App Router — collections, users, roles, forms
components/       # Admin shell, collection nav, UI primitives
lib/              # BFF proxy tới idx-api, auth, gateway helpers
tests/            # Vitest
```

**Env:** `apps/admin/.env.local`. Staff SSO + gateway qua idx-api.

### `apps/idx-api/`

```text
src/
  app.ts          # Hono entry
  routes/         # HTTP routes (auth, rag, admin, health)
  gateway/        # ModularRAG client — URL + API keys chỉ ở đây
  db/             # Persistence (store, bootstrap, types)
  middleware/     # Auth, RBAC, service secret
  services/       # Business logic
drizzle/          # SQL migrations (Postgres legacy; xem db/ cho store hiện tại)
tests/            # Vitest
openapi.yaml      # API contract
```

**Env:** `apps/idx-api/.env` — JWT, Google OAuth, `MODULAR_RAG_GATEWAY_URL`, API keys.

### ⚠️ `apps/auth-api/` — KHÔNG DÙNG

Thư mục mồ côi sau khi đổi tên `auth-api` → `idx-api`. Nếu xuất hiện (thường rỗng, do Windows file lock), **xóa an toàn**. Đã liệt kê trong `.gitignore`.

---

## `packages/` — Shared libraries

Không chạy server riêng. Apps import qua `"workspace:*"`.

| Package | Tên npm | Mục đích |
| --- | --- | --- |
| `packages/modular-rag-sdk` | `@idx/modular-rag-sdk` | Parse SSE gateway, types — **không** import Next/React DOM |
| `packages/voice-input` | `@idx/voice-input` | Mic button, playback queue, voice session hook |

```text
packages/<name>/
  src/              # Source
  tests/            # Vitest (nếu có)
  package.json
  tsconfig.json
```

**Quy tắc phụ thuộc:** apps → packages; packages không import apps. `voice-input` có thể dùng `modular-rag-sdk` + React.

---

## `node_modules/` — Dependencies

- **Root** `node_modules/`: pnpm hoist + symlink `.pnpm/`.
- **Per-app** `apps/*/node_modules/`: symlink tới workspace packages (`@idx/*`) và deps cục bộ.

**Không commit, không sửa tay.** Sau khi restore `packages/`, chạy `pnpm install` để sửa symlink broken.

---

## `docs/` — Documentation (Harness + product)

| Nhánh | Nội dung |
| --- | --- |
| `docs/DOC_MAP.md` | **Đọc đầu tiên** — map toàn bộ docs |
| `docs/REPO_LAYOUT.md` | File này — giải thích thư mục repo |
| `docs/ARCHITECTURE.md` | Layering, dependency rules |
| `docs/product/` | Product contract (user-chat, admin, BFF, security…) |
| `docs/stories/` | Epics E01–E09, backlog |
| `docs/decisions/` | ADR 0008–0022 |
| `docs/HARNESS.md` | Vận hành Harness cho agent |

Harness installer tạo `docs/` local; đừng xóa cả thư mục nếu đang dùng Harness workflow.

---

## `scripts/` — Tooling

| Path | Mục đích |
| --- | --- |
| `scripts/bin/harness-cli(.exe)` | Harness CLI (download, gitignored) |
| `scripts/schema/` | SQLite schema migrations cho `harness.db` |
| `scripts/dev/e2e-smoke.mjs` | Smoke test (`pnpm test:e2e`, `pnpm test:platform`) |

---

## File cấu hình root

| File | Mục đích |
| --- | --- |
| `.env.example` | Template env stack dev |
| `.env.prod.example` | Template env production |
| `docker-compose.yml` | Dev: mongo/postgres + idx-api + apps |
| `docker-compose.prod.yml` | Prod compose |
| `harness.db` | Harness durable DB (local, gitignored) |
| `AGENTS.md` | Shim hướng dẫn agent (local, gitignored) |

---

## Artifact có thể xóa an toàn

Chạy định kỳ khi repo “bẩn” — **không ảnh hưởng source**:

```powershell
Remove-Item tmp_auth_api.*.log -ErrorAction SilentlyContinue
Remove-Item -Recurse terminals, agent-tools, mcps, tmp -ErrorAction SilentlyContinue
Remove-Item -Recurse apps/auth-api -ErrorAction SilentlyContinue
Remove-Item -Recurse .pnpm-store -ErrorAction SilentlyContinue
pnpm install   # sau khi restore packages/ hoặc đổi lockfile
```

---

## Lệnh validate nhanh

Xem hướng dẫn đầy đủ: [LOCAL_DEV.md](./LOCAL_DEV.md).

```powershell
pnpm install
pnpm dev:stack     # chạy stack local
pnpm test          # Vitest
pnpm test:e2e      # smoke (stack phải đang chạy)
```

## Liên quan

- [LOCAL_DEV.md](./LOCAL_DEV.md)
- [DOC_MAP.md](./DOC_MAP.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [product/overview.md](./product/overview.md)
- [README.md](../README.md)