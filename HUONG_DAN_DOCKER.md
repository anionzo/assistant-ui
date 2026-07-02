# Hướng dẫn Docker — Idx Chat

Triển khai stack Idx Chat bằng Docker: dev (hot-reload) hoặc prod (build image). Repo: `assistant-ui`.

| Mục đích | File compose | Lệnh |
| --- | --- | --- |
| Dev local | `docker-compose.yml` | `pnpm dev:stack` |
| Prod / staging | `docker-compose.prod.yml` | `pnpm prod:stack` |

---

## 1. Cài Docker

### Windows 10/11 (khuyên dùng Docker Desktop)

**Yêu cầu:** Virtualization bật trong BIOS, RAM ≥ 8 GB, ổ trống ≥ 10 GB.

1. **Bật WSL 2** (PowerShell **Admin**):

```powershell
wsl --install
# Khởi động lại máy nếu được yêu cầu
wsl --set-default-version 2
```

2. **Tải & cài** [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).

3. Mở Docker Desktop → **Settings**:
   - **General** → tick *Use the WSL 2 based engine*
   - **Resources** → RAM ≥ 4 GB (khuyên 6 GB+)
   - **Resources → File sharing** → thêm ổ chứa repo (vd. `E:\`) nếu clone ngoài `C:\`

4. Đợi icon **whale** trên taskbar chuyển *Running* (không còn "Starting…").

5. Kiểm tra:

```powershell
docker version
docker compose version
docker run --rm hello-world
```

| Lỗi cài đặt | Xử lý |
| --- | --- |
| `WSL 2 installation is incomplete` | Cài [WSL2 kernel update](https://aka.ms/wsl2kernel), reboot |
| `Hardware assisted virtualization` | Bật VT-x/AMD-V trong BIOS |
| `docker: command not found` | Mở lại terminal sau khi cài Desktop; kiểm tra PATH |
| Build/dev chậm | Tăng RAM Docker; đặt repo trong WSL filesystem hoặc bật file sharing đúng ổ |

### macOS

1. Tải [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) (Apple Silicon hoặc Intel).
2. Cài, mở app, đợi whale *Running*.
3. `docker version` && `docker compose version`.

### Linux server (Ubuntu 22.04+)

```bash
# Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
# Đăng xuất / đăng nhập lại để dùng docker không cần sudo

docker version
docker compose version
```

Firewall (nếu expose ra internet): mở **80/443** (reverse proxy); chỉ mở **3001/3002/4000** khi test trực tiếp (không khuyên prod).

---

## 2. Chuẩn bị env (một file gốc)

```powershell
cd <đường-dẫn-repo>\assistant-ui
pnpm install

Copy-Item .env.example .env
# Sửa .env: Google OAuth, ModularRAG URL, API keys…

pnpm setup:env          # sinh apps/idx-api/.env, user-chat/.env.local, admin/.env.local
pnpm setup:env:check    # kiểm tra secret khớp
```

**Chỉ sửa `.env` ở root** — chạy lại `pnpm setup:env` sau mỗi lần đổi.

Docker dev đọc env từ 3 file app (do script sinh ra), không đọc trực tiếp root `.env`.

---

## 3. Dev stack (hot-reload, khuyên dùng khi code)

```powershell
pnpm dev:stack
```

Lệnh này tự: `setup:env` → `docker compose up -d --build`.

| Service | URL | Ghi chú |
| --- | --- | --- |
| user-chat | http://localhost:3001 | Next dev, mount source |
| admin | http://localhost:3002 | Next dev, mount source |
| idx-api | http://localhost:4000/health | Hono dev + db:bootstrap |
| mongo | localhost:27017 | Volume `mongodata` |

```powershell
pnpm dev:stack:logs     # tail log
pnpm dev:stack:down     # tắt (data Mongo **giữ**)
```

### Dev image

Dùng `docker/Dockerfile.dev` — **không** build Next production. Source mount từ host, container chạy `pnpm dev`.

### Override nội bộ Docker

Compose tự set (không cần sửa tay):

| Biến | Trong container |
| --- | --- |
| `MONGODB_URI` | `mongodb://mongo:27017/idx_api` |
| `IDX_API_URL` | `http://idx-api:4000` |

`MODULAR_RAG_GATEWAY_URL` trong `.env` — dùng IP host gateway (vd. `http://host.docker.internal:8030` hoặc IP server ModularRAG).

---

## 4. Production stack (build image, không mount source)

### Bước 1 — File env production

```powershell
Copy-Item .env.prod.example .env.prod
# Sửa .env.prod — KHÔNG commit file này
```

| Biến bắt buộc | Ví dụ |
| --- | --- |
| `IDX_JWT_SECRET` | Chuỗi ≥ 32 ký tự |
| `IDX_SERVICE_SECRET` | Shared BFF ↔ idx-api |
| `USER_API_KEY` | Key ModularRAG user |
| `ADMIN_API_KEY` | Key ModularRAG admin |
| `MODULAR_RAG_GATEWAY_URL` | URL gateway (vd. `http://host.docker.internal:8030`) |

Tuỳ chọn: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_SEED_EMAIL`, `IDX_FRONTEND_URL`.

### Bước 2 — Build & chạy

```powershell
pnpm prod:stack
```

Hoặc tay:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

| Service | URL host | Port container |
| --- | --- | --- |
| user-chat | http://localhost:3001 | 3000 |
| admin | http://localhost:3002 | 3002 |
| idx-api | http://localhost:4000 | 4000 |

```powershell
pnpm prod:stack:down
# hoặc: docker compose -f docker-compose.prod.yml down
```

### Prod image

| App | Dockerfile | Output |
| --- | --- | --- |
| idx-api | `apps/idx-api/Dockerfile` | Node dist + bootstrap |
| user-chat | `apps/user-chat/Dockerfile` | Next standalone :3000 |
| admin | `apps/admin/Dockerfile` | Next standalone :3002 |

Lần đầu build prod **5–15 phút** (pnpm install + next build).

---

## 5. MongoDB — data có mất không?

| Lệnh | Data |
| --- | --- |
| `dev:stack:down` / `compose down` | **Giữ** (volume `mongodata`) |
| Restart Docker Desktop | **Giữ** |
| `docker compose down -v` | **Mất** |
| Docker prune volumes | **Có thể mất** |

Volume dev: `assistant-ui_mongodata`  
Volume prod: `assistant-ui_idx_mongodata`

Kiểm tra:

```powershell
docker volume ls
docker compose exec mongo mongosh idx_api --eval "db.users.countDocuments()"
```

---

## 6. Kiểm tra sau khi chạy

```powershell
curl http://localhost:4000/health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health

pnpm test:e2e
pnpm test:platform
```

---

## 7. Lỗi thường gặp (Docker)

| Triệu chứng | Xử lý |
| --- | --- |
| `bind: port already in use` | Process khác chiếm :3001/:4000 — `dev:stack:down` hoặc tắt native `pnpm dev` |
| Build fail `@idx/i18n` | Pull bản mới có fix Dockerfile admin/user-chat |
| `IDX_SERVICE_SECRET` 401 | Chạy `pnpm setup:env` lại |
| idx-api unhealthy | `docker compose logs idx-api` — thường thiếu Mongo hoặc env |
| Chat 502 | Gateway không reachable từ container — đổi `MODULAR_RAG_GATEWAY_URL` sang IP host / `host.docker.internal` |
| Dev chậm lần đầu | `pnpm install` trong container — đợi log "Ready" |
| Windows file watch | Docker Desktop → Settings → giao diện file sharing đúng ổ chứa repo |

---

## 8. So sánh dev vs prod

| | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`) |
| --- | --- | --- |
| Mục đích | Code, hot-reload | Deploy staging/prod |
| Source | Mount `./` từ host | Bake vào image |
| Next.js | `next dev` | `next build` + standalone |
| Env | `pnpm setup:env` → 3 file app | `.env.prod` + `--env-file` |
| Lệnh | `pnpm dev:stack` | `pnpm prod:stack` |

---

## 9. Triển khai server (production chuẩn)

### Sơ đồ mạng Docker prod

```text
Internet
   │
   ▼
[Nginx / Caddy :443]  ← HTTPS, domain thật (khuyên dùng)
   │
   ├── chat.example.com      → idx-chat-user :3001 (host)
   ├── admin.example.com     → idx-chat-admin :3002 (host)
   └── api.example.com       → idx-api :4000 (host)  [tuỳ chọn, thường chỉ nội bộ]

idx-chat-user / idx-chat-admin ──→ idx-api (mạng Docker nội bộ)
idx-api ──→ mongo (volume idx_mongodata)
idx-api ──→ ModularRAG gateway (host / server khác)
```

Frontend container **không** cần biết URL ModularRAG — chỉ `IDX_API_URL=http://idx-api:4000` (compose tự set).

### Bước trên server

```bash
git clone https://github.com/HUIT-IDX/assistant-ui.git
cd assistant-ui
pnpm install   # hoặc chỉ cần Docker prod — install trên host là tuỳ chọn

pnpm setup:env:prod
# Sửa .env.prod — xem bảng bên dưới

pnpm prod:stack
pnpm prod:stack:logs   # theo dõi lần build đầu (5–15 phút)
```

### Biến `.env.prod` quan trọng

| Biến | Dev local | Prod server |
| --- | --- | --- |
| `IDX_JWT_SECRET` | Có thể đơn giản | Chuỗi ngẫu nhiên ≥ 32 byte — **khác** dev |
| `IDX_SERVICE_SECRET` | Shared dev | Secret mạnh, **khác** dev |
| `IDX_FRONTEND_URL` | `http://localhost:3001` | `https://chat.example.com` |
| `IDX_ADMIN_FRONTEND_URL` | `http://localhost:3002` | `https://admin.example.com` |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/auth/google/callback` | `https://api.example.com/auth/google/callback` hoặc URL public của idx-api |
| `MODULAR_RAG_GATEWAY_URL` | `http://host.docker.internal:8030` | IP/URL gateway reachable **từ container** |

Sinh secret nhanh (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Google OAuth prod: thêm redirect URI + domain vào **Authorized domains** trong Google Cloud Console; publish consent screen khi ra production.

### Reverse proxy (khuyên dùng)

Expose trực tiếp `:3001/:3002/:4000` chỉ phù hợp staging. Prod nên đặt Nginx/Caddy phía trước:

- `chat.example.com` → `http://127.0.0.1:3001`
- `admin.example.com` → `http://127.0.0.1:3002`
- TLS certificate (Let's Encrypt)

idx-api có thể **không** public — user-chat/admin gọi nội bộ qua Docker network; chỉ `GOOGLE_CALLBACK_URL` cần URL public nếu dùng Google login.

### Vận hành

```powershell
pnpm prod:stack:logs          # log realtime
pnpm prod:stack:down          # tắt (data Mongo giữ trong volume)
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml restart idx-api
```

Cập nhật phiên bản:

```powershell
git pull
pnpm prod:stack    # rebuild image + rolling restart
```

Backup Mongo (prod volume `assistant-ui_idx_mongodata`):

```powershell
docker compose -f docker-compose.prod.yml exec mongo mongodump --db idx_api --out /data/db/backup
```

---

## 10. Checklist triển khai chuẩn

### Dev (máy lập trình)

```powershell
pnpm install
Copy-Item .env.example .env    # chỉnh secret + Google + gateway
pnpm setup:env
pnpm setup:env:check
pnpm dev:stack
# Đợi healthy: docker compose ps
curl http://localhost:4000/health
pnpm test:e2e
```

### Prod (server)

```powershell
pnpm setup:env:prod
# Chỉnh .env.prod: secret, domain, Google, ModularRAG URL
pnpm prod:stack
docker compose -f docker-compose.prod.yml ps    # tất cả healthy
curl http://localhost:4000/health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
# Cấu hình reverse proxy + HTTPS
# Test đăng nhập Google + upload + chat
```

Xem thêm: [HUONG_DAN_CHAY.md](HUONG_DAN_CHAY.md) (native, Google OAuth chi tiết).