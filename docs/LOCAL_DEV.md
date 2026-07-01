# Chạy local — Idx Chat

Hướng dẫn setup và chạy toàn bộ stack trên máy dev (Windows PowerShell). Repo: `assistant-ui`.

## Yêu cầu

| Tool | Ghi chú |
| --- | --- |
| Node.js 20+ | Khuyến nghị LTS |
| pnpm 11 | `corepack enable` hoặc `npm i -g pnpm` |
| Docker Desktop | Cách 1 (stack đầy đủ) hoặc chỉ Mongo (Cách 2) |
| Git | Clone repo |

Tuỳ chọn (chat RAG thật): ModularRAG gateway chạy ở `http://localhost:8030`.

## Ports

| URL | Service |
| --- | --- |
| http://localhost:3001 | User chat (`@idx/user-chat`) |
| http://localhost:3002 | Admin (`@idx/admin`) |
| http://localhost:4000 | idx-api (auth + RAG gateway boundary) |
| http://localhost:27017 | MongoDB (dev) |
| http://localhost:8030 | ModularRAG gateway (upstream, tuỳ chọn) |

---

## Bước 0 — Chuẩn bị (một lần)

```powershell
cd E:\CODE\HUIT-Project\assistant-ui

pnpm install
```

Tạo file env từ template:

```powershell
Copy-Item apps\idx-api\.env.example apps\idx-api\.env
Copy-Item apps\user-chat\.env.example apps\user-chat\.env.local
Copy-Item apps\admin\.env.example apps\admin\.env.local
```

**Quan trọng:** `IDX_SERVICE_SECRET` phải **giống nhau** ở cả 3 app. Ví dụ dev:

```env
# apps/idx-api/.env
IDX_SERVICE_SECRET=dev-service-secret

# apps/user-chat/.env.local
IDX_SERVICE_SECRET=dev-service-secret

# apps/admin/.env.local
IDX_SERVICE_SECRET=dev-service-secret
```

Các biến khác mặc định trong `.env.example` đủ để chạy local không login / guest chat (`AUTH_REQUIRED=false`).

### Tạo admin đầu tiên (tuỳ chọn)

1. Trong `apps/idx-api/.env`, set `ADMIN_SEED_EMAIL=admin@huit.edu.vn`
2. Đăng ký tài khoản bằng email đó (user-chat hoặc Google OAuth)
3. idx-api tự gán role `super_admin`

### Chat RAG thật (tuỳ chọn)

Trong `apps/idx-api/.env`:

```env
MODULAR_RAG_GATEWAY_URL=http://localhost:8030
USER_API_KEY=demo-api-key
ADMIN_API_KEY=demo-admin-key
```

Không có ModularRAG: health/smoke vẫn pass; stream chat có thể trả 502.

---

## Cách 1 — Docker stack (khuyên dùng)

Chạy Mongo + idx-api + user-chat + admin trong một lệnh.

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm dev:stack
```

Lần đầu build image có thể mất vài phút. Đợi healthcheck xong (~1–2 phút), rồi mở:

- http://localhost:3001 — chat
- http://localhost:3002 — admin
- http://localhost:4000/health — idx-api OK?

### Lệnh hỗ trợ

```powershell
pnpm dev:stack:logs    # xem log mongo, idx-api, user-chat, admin
pnpm dev:stack:down    # tắt stack
```

Docker tự override `MONGODB_URI` và `IDX_API_URL` nội bộ mạng container — không cần sửa env khi dùng Cách 1.

---

## Cách 2 — Native (từng terminal)

Dùng khi debug từng app riêng hoặc không muốn chạy full Docker.

### Bước 2a — MongoDB

Chỉ bật Mongo bằng Docker:

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
docker compose up -d mongo
```

Hoặc cài MongoDB local, đảm bảo `MONGODB_URI=mongodb://localhost:27017/idx_api` trong `apps/idx-api/.env`.

### Bước 2b — Ba terminal

**Terminal 1 — idx-api**

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm --filter @idx/idx-api db:bootstrap
pnpm --filter @idx/idx-api dev
```

**Terminal 2 — user-chat**

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm --filter @idx/user-chat dev
```

**Terminal 3 — admin** (tuỳ chọn)

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm --filter @idx/admin dev
```

### Shortcut từ root

```powershell
pnpm dev          # chỉ user-chat :3001
pnpm dev:admin    # chỉ admin :3002
```

`IDX_API_URL` trong env local phải là `http://localhost:4000` (không dùng tên service Docker).

---

## Test & validate

### Unit test (không cần server)

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm test
```

### Typecheck

```powershell
pnpm typecheck
```

### Build production

```powershell
pnpm build
```

### Smoke E2E (cần stack đang chạy)

Chạy **sau** Cách 1 hoặc Cách 2 (cả 3 app + mongo up):

```powershell
pnpm test:e2e        # health idx-api, user-chat, auth gate /api/threads
pnpm test:platform   # thêm admin /api/health
```

### Test từng package

```powershell
pnpm --filter @idx/idx-api test
pnpm --filter @idx/user-chat test
pnpm --filter @idx/admin test
pnpm --filter @idx/modular-rag-sdk test
```

---

## Checklist nhanh

```powershell
cd E:\CODE\HUIT-Project\assistant-ui
pnpm install
# copy .env (xem Bước 0)
pnpm dev:stack
pnpm test
pnpm test:e2e
# Browser: :3001, :3002, :4000/health
```

---

## Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| `pnpm test:e2e` fail `fetch failed` | Stack chưa chạy — `pnpm dev:stack` hoặc bật 3 terminal Cách 2 |
| `@idx/modular-rag-sdk` not found | `git checkout packages/` rồi `pnpm install` |
| idx-api không connect DB | Kiểm tra Mongo (`docker compose ps`), `MONGODB_URI` |
| 401/403 giữa BFF và idx-api | `IDX_SERVICE_SECRET` không khớp giữa 3 app |
| Chat 502 | ModularRAG `:8030` chưa chạy hoặc thiếu API key trong `apps/idx-api/.env` |
| Port đã dùng | Đổi port trong env hoặc `docker compose down` |

---

## Liên quan

- [REPO_LAYOUT.md](./REPO_LAYOUT.md) — giải thích thư mục repo
- [product/deployment.md](./product/deployment.md) — Docker prod, env đầy đủ
- [DOC_MAP.md](./DOC_MAP.md) — map docs toàn project
- [README.md](../README.md) — tổng quan product