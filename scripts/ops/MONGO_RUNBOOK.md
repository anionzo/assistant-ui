# MongoDB runbook — Idx Chat

## Tên chuẩn (không đổi trong code)

| Mục | Giá trị |
| --- | --- |
| Database | `idx_api` |
| Collection chat | `chat_threads` |
| Volume local (dev) | `idx_chat_mongodata` |
| Container local (dev) | `idx-chat-mongo` |

**Nguồn cấu hình duy nhất khi deploy:** `MONGODB_URI` trong root `.env` trên server.

## Kiến trúc

- **Production HUIT:** Mongo ngoài (Atlas / VM). App stack (`docker-compose.yml`) **không** chứa service `mongo`.
- **Local dev:** Mongo tùy chọn qua `docker-compose.db.yml` + `pnpm stack:db`.

## Lệnh vận hành

```powershell
pnpm ops:mongo:inspect
pnpm ops:mongo:backup
pnpm ops:mongo:bootstrap
pnpm ops:deploy
pnpm ops:deploy -- --skip-backup
```

## Deploy server HUIT (Mongo Atlas/VM)

1. Tạo cluster / DB `idx_api` trên Atlas (hoặc VM Mongo).
2. Sửa root `.env`: `MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/idx_api`
3. `pnpm ops:mongo:inspect`
4. `pnpm ops:deploy`
5. `docker compose exec idx-api printenv MONGODB_URI` — phải trùng `.env`

## Khôi phục data từ volume Docker cũ

```powershell
docker volume ls | findstr mongodata
docker run --rm -v assistant-ui_mongodata:/data/db mongo:7 mongodump --db=idx_api --out=/data/db/dump
```

Restore vào Atlas rồi `pnpm ops:mongo:inspect`.

## Chẩn đoán nhanh

| Triệu chứng | Nguyên nhân |
| --- | --- |
| `chat_threads = 0` | DB/volume mới hoặc URI trỏ instance trống |
| URI vẫn `mongodb://mongo:27017` | Compose cũ — pull bản mới + sửa `.env` |
| UI trống, DB có data | Guest mode hoặc login account khác |