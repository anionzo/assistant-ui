# Lecturer Chat (`@idx/lecturer-chat`)

Bản clone tạm của `user-chat` dành cho **giảng viên**.  
Nhánh làm việc: `feat/lecturer-portal` — **không** sửa app sinh viên trên `main`.

## Chạy local

```bash
# từ root monorepo
pnpm install
pnpm dev:lecturer
# → http://localhost:3004
```

Copy env từ user nếu cần:

```bash
cp apps/user-chat/.env.local apps/lecturer-chat/.env.local
```

## Ghi chú

- Cùng stack Next + assistant-ui + BFF như user-chat.
- FE copy đã đổi copy/i18n theo ngữ cảnh giảng viên (soạn bài, quy chế, chấm điểm…).
- Backend/API vẫn trỏ idx-api như user; tách corpus/pipeline riêng có thể làm sau.
