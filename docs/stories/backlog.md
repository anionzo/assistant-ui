# Story Backlog

## Epics

| Epic | Description | Status | Packet |
| --- | --- | --- | --- |
| E01 | Product docs bootstrap | implemented | [E01-docs-bootstrap](./epics/E01-docs-bootstrap/) |
| E02 | user-chat MVP | implemented | [E02-user-chat-mvp](./epics/E02-user-chat-mvp/) |
| E03 | Thread server-sync + sidebar | implemented | [E03-thread-persistence](./epics/E03-thread-persistence/) |
| E04 | voice-input package | implemented | [E04-voice-input](./epics/E04-voice-input/) |
| E05 | RAG citations + toolbar | implemented | [E05-rag-toolbar](./epics/E05-rag-toolbar/) |
| E06 | admin app + RBAC | implemented | [E06-admin-app](./epics/E06-admin-app/) |
| E07 | JWT gate + compose cutover | implemented | [E07-sso-hardening](./epics/E07-sso-hardening/) *(folder tên cũ)* |
| E08 | Auth API (email + Google) | implemented | [E08-auth-api](./epics/E08-auth-api/) |

## Dependency Graph

```text
E01 (docs) ──► E02 (user-chat MVP, AUTH_DISABLED)
                 ├──► E04 (voice)
                 └──► E05 (RAG UI)
E02 ──► E08 (email + Google + cookie)
         └──► E03 (server threads — requires userId) ──► E07 (AUTH_REQUIRED + prod)
E01 ──► E06 (admin)     [parallel after E02 BFF pattern]
```

## Implementation Order

1. E02 — first code (`AUTH_DISABLED=true`, no sidebar)
2. E08 — email register/login + Google OAuth + BFF cookie (cả hai trước E07)
3. E03 — server thread APIs + sidebar (after E08)
4. E04, E05, E06 — parallel sau E02 (E04/E05 không block E03)
5. E07 — `AUTH_REQUIRED=true` + compose prod

## Gate

Docs gate **PASS** — see [E01 validation](./epics/E01-docs-bootstrap/validation.md). E02 may start when PO accepts defaults in [spec-intake.md](../spec-intake.md) or logs override.

---

## Next Up — Auth UI Polish + Admin User Management (post-E08)

### Tổng quan

```
┌──────────────────────────────────────────────────────────────┐
│  User-chat (frontend)           Auth-api (backend)           │
│  ─────────────────────           ──────────────────          │
│  /login                          POST /auth/login             │
│    + quên mật khẩu?  ──────►     POST /auth/forgot-password  │
│  /quen-mat-khau                  POST /auth/reset-password   │
│  /dat-lai-mat-khau                                            │
│                                                               │
│  /register                       POST /auth/register          │
│    + xác nhận mật khẩu                                        │
│                                                               │
│  /settings                       GET  /auth/me                │
│    + cập nhật tên hiển thị ──►   POST /auth/set-password     │
│    + đổi mật khẩu                                             │
│    + đặt mk (Google user)                                     │
│                                                               │
│  Admin (port 3002)               Auth-api /admin/*            │
│  ──────────────────              ───────────────────          │
│  /admin/users                    GET  /admin/users            │
│    + search, filter ─────────►   GET  /admin/users/:id        │
│    + ban/unban ─────────────►    PATCH /admin/users/:id/ban   │
│    + reset mk ─────────────►     POST /admin/users/:id/reset-pw│
│    + force logout ─────────►     POST /admin/users/:id/logout │
│    + delete user ─────────►     DELETE /admin/users/:id       │
│    + assign/revoke role ───►     POST /admin/users/:id/roles  │
└──────────────────────────────────────────────────────────────┘
```

### DB changes

| Table | Change | Lý do |
|-------|--------|-------|
| `users` | Thêm `status TEXT DEFAULT 'active'` | active / banned / disabled |
| `permissions` | Thêm 4 permission mới (ID 54-57) | users.ban, users.reset_password, users.delete, users.force_logout |
| `password_reset_tokens` | **Bảng mới** | id, user_id, token_hash, expires_at, used_at |

### Permissions mới (ID 54-57)

| ID | Code | Mô tả |
|----|------|-------|
| 54 | `users.ban` | Khóa/mở khóa tài khoản người dùng |
| 55 | `users.reset_password` | Reset mật khẩu của user bất kỳ |
| 56 | `users.delete` | Xóa tài khoản người dùng |
| 57 | `users.force_logout` | Đăng xuất tất cả phiên của user |

### Phân công role mới

| Permission | super_admin | admin | operator | viewer | user |
|-----------|:---:|:---:|:---:|:---:|:---:|
| users.ban (54) | ✅ | ❌ | ❌ | ❌ | ❌ |
| users.reset_password (55) | ✅ | ❌ | ❌ | ❌ | ❌ |
| users.delete (56) | ✅ | ❌ | ❌ | ❌ | ❌ |
| users.force_logout (57) | ✅ | ❌ | ❌ | ❌ | ❌ |

> Chỉ super_admin mới có quyền quản lý user (ban, reset pw, delete, force logout).
> Admin thường chỉ quản lý collections/documents/forms.

### Task list chi tiết

#### B1 — Auth-api: forgot/reset password

| # | Việc | File | Chi tiết |
|---|------|------|----------|
| B1.1 | Migration `0002_reset_tokens.sql` | `drizzle/` | Tạo bảng `password_reset_tokens(id UUID PK, user_id UUID FK, token_hash TEXT, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ?)` |
| B1.2 | Schema + store | `db/schema.ts`, `db/store.ts` | Drizzle schema + `createResetToken`, `findValidResetToken`, `consumeResetToken` |
| B1.3 | Service | `services/reset-password.ts` | `generateResetToken()`, `hashResetToken()`, `createResetTokenForEmail()` |
| B1.4 | Route | `routes/auth.ts` | `POST /auth/forgot-password { email }` → tạo token, trả về (dev: trả token, prod: gửi email); `POST /auth/reset-password { token, password }` → verify token, đổi mk |
| B1.5 | Tests | `tests/auth-routes.test.ts` | Test forgot → reset flow |

#### B2 — Auth-api: admin user management mở rộng

| # | Việc | File | Chi tiết |
|---|------|------|----------|
| B2.1 | Migration `0003_user_status.sql` | `drizzle/` | `ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`; thêm 4 permission mới (54-57) |
| B2.2 | Schema | `db/schema.ts` | Thêm `status` vào users table |
| B2.3 | Store | `db/store.ts` | `setUserStatus(userId, status)`, `revokeAllUserTokens(userId)`, `deleteUser(userId)`, `setUserPassword` (đã có) |
| B2.4 | Admin routes | `routes/admin.ts` | `PATCH /admin/users/:id/ban { status }`, `POST /admin/users/:id/reset-password { password }`, `POST /admin/users/:id/force-logout`, `DELETE /admin/users/:id` |
| B2.5 | Permissions | `services/permissions.ts` | Thêm `USERS_BAN: 54`, `USERS_RESET_PASSWORD: 55`, `USERS_DELETE: 56`, `USERS_FORCE_LOGOUT: 57` |
| B2.6 | Constants | `apps/admin/lib/auth/permissions.ts` | Sync thêm 4 constants mới |

#### B3 — Auth-api: user update profile + change password

| # | Việc | File | Chi tiết |
|---|------|------|----------|
| B3.1 | Route | `routes/auth.ts` | `PATCH /auth/profile { displayName }` — user tự update profile (cần JWT) |
| B3.2 | Route | `routes/auth.ts` | `POST /auth/change-password { oldPassword, newPassword }` — user tự đổi mk (cần JWT) |
| B3.3 | Tests | `tests/auth-routes.test.ts` | Test profile update + change password |

#### B4 — User-chat: auth UI polish

| # | Việc | File | Chi tiết |
|---|------|------|----------|
| B4.1 | Quên mật khẩu trang | `app/quen-mat-khau/page.tsx` | Form nhập email → nhận token → form đặt mk mới |
| B4.2 | Login: thêm link | `app/login/page.tsx` | "Quên mật khẩu?" link → `/quen-mat-khau` |
| B4.3 | Register: confirm password | `app/register/register-form.tsx` | Thêm `name="confirmPassword"`, validate match + email regex client-side |
| B4.4 | Xóa jargon | `app/login/page.tsx`, `app/register/page.tsx` | "Đăng nhập để lưu lịch sử trò chuyện", "Tạo tài khoản miễn phí" |
| B4.5 | Settings: cập nhật tên | `app/settings/settings-view.tsx` | Form edit displayName → gọi `PATCH /auth/profile` |
| B4.6 | Settings: đặt/đổi mk | `app/settings/settings-view.tsx` | Nếu có password_hash → form đổi mk (old + new); nếu không (Google user) → form đặt mk mới |
| B4.7 | Guest mode VI | `components/threadlist-sidebar.tsx` | "Chế độ khách — trò chuyện không được lưu. Đăng nhập để lưu." |
| B4.8 | Settings: xóa tài khoản | `app/settings/settings-view.tsx` | Nút "Xóa tài khoản" + confirm dialog → `DELETE /auth/account` |

#### B5 — Admin: user management UI

| # | Việc | File | Chi tiết |
|---|------|------|----------|
| B5.1 | Users list page | `app/admin/users/page.tsx` (MỚI, nếu có admin UI riêng) | Bảng users: email, displayName, status, roles, actions |
| B5.2 | User detail page | `app/admin/users/[id]/page.tsx` (MỚI) | View user info + roles + permissions |
| B5.3 | Ban/unban button | `app/admin/users/*` | Toggle `status` giữa active/banned |
| B5.4 | Reset password form | `app/admin/users/*` | Nhập mk mới → `POST /admin/users/:id/reset-password` |
| B5.5 | Force logout button | `app/admin/users/*` | Revoke all sessions |
| B5.6 | Delete user button | `app/admin/users/*` | Confirm → xóa |
| B5.7 | Link trong admin sidebar | `components/collection-nav.tsx` hoặc admin layout | Thêm "Users" vào nav |

### Thứ tự triển khai

```
B1 (forgot/reset pw) → B2 (admin user mgmt mở rộng) → B3 (user self-service API)
                                                              ↓
B4 (user-chat UI polish) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ┘
B5 (admin user mgmt UI)
```

### Phụ thuộc

- B1, B2, B3 phụ thuộc auth-api (DB migration + routes)
- B4 phụ thuộc B3 (cần API endpoints để gọi)
- B5 phụ thuộc B2 (cần admin API endpoints)
- B4, B5 song song được (khác app)

---

## Notes / Patterns (đọc trước khi code sau này)

### Auth flow
```
Browser → BFF /api/auth/login → auth-api /auth/login → JWT tokens
BFF sets cookies via response.cookies.set() (on Response object)
Server Components: use checkSession() (read-only), not resolveSession()
Route Handlers: use resolveSession() (can refresh + write cookies)
cookies().set() FAILS in Server Components → always set on Response object
idx_refresh TTL: 7 days (JWT_REFRESH_TTL=604800), idx_session TTL: 1h (JWT_ACCESS_TTL=3600)
```

### RBAC permission model
```
JWT: role_ids (INT[]) only — compact
/auth/me: returns { user, roles, permissions: string[], permission_ids: int[] }
Admin BFF: requireAdminPermission(P.COLLECTIONS_READ) — checks by INT ID
Permission IDs: 10-14 collections, 20-23 documents, 30-32 files, 40-43 forms, 50-57 users
Role IDs: 1=super_admin, 2=admin, 3=operator, 4=viewer, 5=user
```

### Response format
```
ALL APIs return flat JSON — no { success, data } wrapper
Client: body.users (NOT body.data.users)
Error: body.error as string (NOT body.error.message)
```
