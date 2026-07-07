# Hướng dẫn Docker — Idx Chat

Repo dùng **một** file `docker-compose.yml` và **một** nguồn cấu hình root `.env`.

## Chuẩn bị

```powershell
Copy-Item .env.example .env
# Chỉnh secret, Google OAuth và ModularRAG trong .env
docker compose config
```

Không cần tạo `.env.prod`, cũng không cần sửa env trong từng app khi chạy Docker.

## Chạy stack

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f mongo idx-api idx-chat-user idx-chat-admin
```

Hoặc dùng alias:

```powershell
pnpm stack
```

| Service | URL host |
| --- | --- |
| user-chat | http://localhost:3001 |
| admin | http://localhost:3002 |
| idx-api | http://localhost:4000 |
| MongoDB | mongodb://localhost:27017 |

Compose tự cấu hình hai địa chỉ nội bộ cố định:

- `idx-api` kết nối Mongo bằng `mongodb://mongo:27017/idx_api`.
- Hai Next.js BFF kết nối API bằng `IDX_API_INTERNAL_URL=http://idx-api:4000`.

`mongo` và `idx-api` ở trên là tên service trong chính `docker-compose.yml`, được Docker DNS phân giải. `IDX_API_URL` trong root `.env` vẫn là URL public dùng cho OAuth redirect: local là `http://localhost:4000`, deploy là domain API thật.

`MODULAR_RAG_GATEWAY_URL` vẫn lấy từ root `.env`; giá trị phải truy cập được từ container. Với gateway chạy trên máy host Docker Desktop, dùng `http://host.docker.internal:8030`.

## Dừng stack

```powershell
docker compose down
```

Lệnh trên giữ volume Mongo. Chỉ `docker compose down -v` mới xóa dữ liệu.

## Chạy native

Native Next.js/idx-api không đọc root `.env` trực tiếp theo cùng cách Docker. Khi cần chạy native:

```powershell
pnpm setup:env
pnpm setup:env:check
```

Script sinh lại ba file app từ root `.env`; không sửa tay các file được sinh.

## Kiểm tra

```powershell
curl http://localhost:4000/health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
pnpm test:e2e
```

Các image production dùng:

- `apps/idx-api/Dockerfile`
- `apps/user-chat/Dockerfile`
- `apps/admin/Dockerfile`
