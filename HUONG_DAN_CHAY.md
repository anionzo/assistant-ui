# Hướng dẫn chạy Idx Chat (local)

Monorepo `assistant-ui` — chat user `:3001`, admin `:3002`, API `:4000`, MongoDB `:27017`.

## Yêu cầu

| Tool | Ghi chú |
| --- | --- |
| Node.js 20+ | LTS |
| pnpm 11 | `corepack enable` |
| Docker Desktop | Khuyên dùng (Cách 1) |
| Git | Clone repo |

Tuỳ chọn: ModularRAG gateway `http://localhost:8030` (chat/upload RAG thật).

## Kiến trúc khi chạy

```text
Browser :3001 (user-chat)  ──→ BFF /api/* ──→ idx-api :4000 ──→ MongoDB
Browser :3002 (admin)      ──→ BFF /api/* ──→ idx-api :4000 ──→ ModularRAG :8030 (nếu có)
```

Frontend **không** giữ API key gateway — chỉ `IDX_API_URL` + `IDX_SERVICE_SECRET`.

---

## Bước 1 — Cài đặt (một lần)

```powershell
cd <đường-dẫn-repo>\assistant-ui
pnpm install
```

### Env — **một file gốc** (khuyên dùng)

Chỉ sửa **`.env` ở root repo** (không sửa tay 3 file app):

```powershell
Copy-Item .env.example .env    # lần đầu
# chỉnh .env (Google OAuth, API keys, …)
pnpm setup:env               # sinh 3 file app tự động
```

| File gốc | Script sinh ra |
| --- | --- |
| `.env` (root) | `apps/idx-api/.env` |
| | `apps/user-chat/.env.local` |
| | `apps/admin/.env.local` |

`pnpm dev:stack` **tự chạy** `setup:env` trước khi bật Docker.

Kiểm tra đồng bộ secret:

```powershell
pnpm setup:env:check
```

**Lần đầu** nếu đã có env cũ trong `apps/*`, `setup:env` sẽ **gom** vào root `.env` rồi sinh lại 3 file.

Mặc định `AUTH_REQUIRED=false` — chat guest không cần login.

---

> **Docker chi tiết (cài Desktop, dev vs prod, Mongo volume):** [HUONG_DAN_DOCKER.md](HUONG_DAN_DOCKER.md)

## Bước 2 — Chạy stack (Docker, khuyên dùng)

```powershell
pnpm dev:stack
```

Lần đầu build image ~ vài phút. Khi healthcheck xong:

| URL | Mô tả |
| --- | --- |
| http://localhost:3001 | User chat |
| http://localhost:3002 | Admin |
| http://localhost:4000/health | idx-api |
| localhost:27017 | MongoDB |

```powershell
pnpm dev:stack:logs    # xem log
pnpm dev:stack:down    # tắt stack
```

Docker tự set `MONGODB_URI` và `IDX_API_URL` nội bộ container — không cần sửa khi dùng Cách này.

---

## Bước 3 — Chạy native (debug từng app)

```powershell
docker compose up -d mongo
pnpm --filter @idx/idx-api db:bootstrap
```

Mở **3 terminal**:

```powershell
# Terminal 1
pnpm --filter @idx/idx-api dev          # :4000

# Terminal 2
pnpm dev                                # user-chat :3001

# Terminal 3
pnpm dev:admin                          # admin :3002
```

`IDX_API_URL` trong env local = `http://localhost:4000`.

---

## Google OAuth (đăng nhập Google)

### Google Cloud Console — https://console.cloud.google.com/

1. **OAuth consent screen** → External → **Testing**
2. **Test users** → thêm email bạn dùng login (vd. `anionzo.ai@gmail.com`)
3. **Credentials** → Create **OAuth client ID** → **Web application**
4. **Authorized redirect URIs** — chỉ một dòng:

   ```
   http://localhost:4000/auth/google/callback
   ```

5. Copy **Client ID** và **Client secret** vào `apps/idx-api/.env`:

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-....
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
FRONTEND_URL=http://localhost:3001
ADMIN_SEED_EMAIL=anionzo.ai@gmail.com
```

| Biến | Ý nghĩa |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `SECRET` | Từ Credentials (Console) |
| `ADMIN_SEED_EMAIL` | Email Google test → tự gán `super_admin` |

Restart idx-api sau khi sửa env:

```powershell
docker compose restart idx-api
# hoặc Ctrl+C rồi pnpm --filter @idx/idx-api dev
```

Test: http://localhost:3001 → Đăng nhập Google → dùng đúng email `ADMIN_SEED_EMAIL`.

---

## ModularRAG (chat / upload tài liệu thật)

Trong `apps/idx-api/.env`:

```env
MODULAR_RAG_GATEWAY_URL=http://localhost:8030
USER_API_KEY=huit-admission-api-key
ADMIN_API_KEY=huit-admission-api-key
```

Không có gateway: app vẫn lên; chat stream / upload có thể **502**.

Admin upload: http://localhost:3002 → Collections → Files → Documents → Publish.

---

## Test

```powershell
pnpm test              # unit (không cần server)
pnpm typecheck
pnpm test:e2e          # smoke — stack phải đang chạy
pnpm test:platform     # thêm admin health
```

---

## Production (Docker)

```powershell
pnpm setup:env:prod    # tạo .env.prod từ template
# chỉnh .env.prod
pnpm prod:stack
```

Chi tiết: [HUONG_DAN_DOCKER.md](HUONG_DAN_DOCKER.md#4-production-stack-build-image-không-mount-source).

---

## Lỗi thường gặp

| Triệu chứng | Xử lý |
| --- | --- |
| `fetch failed` khi `test:e2e` | Chưa chạy stack — `pnpm dev:stack` |
| 401/403 BFF ↔ idx-api | `IDX_SERVICE_SECRET` không khớp 3 app |
| idx-api không connect DB | `docker compose ps` — mongo healthy? |
| Chat/upload 502 | ModularRAG chưa chạy hoặc thiếu API key |
| Google `redirect_uri_mismatch` | Redirect URI Console = `http://localhost:4000/auth/google/callback` |
| Google `access_denied` | Thêm email vào **Test users** (app Testing) |
| Admin documents 400 | Collection id có `:` — cần bản idx-api mới nhất |
| Port bị chiếm | `pnpm dev:stack:down` hoặc đổi port trong env |

---

## Checklist nhanh

```powershell
pnpm install
Copy-Item .env.example .env
pnpm setup:env
pnpm dev:stack
# :3001 chat | :3002 admin | :4000/health
```

Docker chi tiết: [HUONG_DAN_DOCKER.md](HUONG_DAN_DOCKER.md)