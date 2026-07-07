# Hướng dẫn Docker — Idx Chat

Repo tách **app** (`docker-compose.yml`) và **Mongo local** (`docker-compose.db.yml`). Production HUIT dùng Mongo ngoài qua `MONGODB_URI` trong root `.env`.

Chi tiết DB: [scripts/ops/MONGO_RUNBOOK.md](scripts/ops/MONGO_RUNBOOK.md)

## Chuẩn bị

```powershell
Copy-Item .env.example .env
# Chỉnh MONGODB_URI, secret, Google OAuth, ModularRAG
docker compose config
```

## Local — full stack (mongo + app)

```powershell
pnpm stack:db          # mongo, volume cố định idx_chat_mongodata
# Sửa .env: MONGODB_URI=mongodb://host.docker.internal:27017/idx_api
pnpm stack:app         # idx-api + user-chat + admin
# hoặc một lệnh:
pnpm stack
```

| Service | URL host |
| --- | --- |
| user-chat | http://localhost:3003 |
| admin | http://localhost:3002 |
| idx-api | http://localhost:4000 |
| MongoDB (local) | mongodb://localhost:27017 |

- `idx-api` đọc `MONGODB_URI` từ `.env` (không hardcode trong compose).
- BFF kết nối API nội bộ: `IDX_API_INTERNAL_URL=http://idx-api:4000`.

## Production HUIT (Mongo Atlas/VM)

```powershell
# .env: MONGODB_URI=mongodb+srv://...@cluster/idx_api
pnpm ops:mongo:inspect
pnpm ops:deploy
```

App stack **không** chứa service `mongo`. Update app không restart DB.

## Dừng stack

```powershell
docker compose down              # app — không xóa Mongo ngoài
docker compose -f docker-compose.db.yml down   # mongo local
```

**Cấm** `docker compose -f docker-compose.db.yml down -v` trừ khi cố ý xóa data local.

## Ops scripts

| Lệnh | Mô tả |
| --- | --- |
| `pnpm ops:mongo:inspect` | Đếm `users`, `chat_threads` |
| `pnpm ops:mongo:backup` | mongodump → `backups/` |
| `pnpm ops:mongo:bootstrap` | Index + seed RBAC |
| `pnpm ops:deploy` | inspect → backup → up --build → bootstrap |

## Chạy native

```powershell
pnpm stack:db
pnpm setup:env
pnpm --filter @idx/idx-api dev
```

## Kiểm tra

```powershell
curl http://localhost:4000/health
curl http://localhost:3003/api/health
curl http://localhost:3002/api/health
pnpm test:e2e
```