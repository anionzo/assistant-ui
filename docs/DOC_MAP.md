# Idx Chat — Documentation Map

**Một trang đọc trước khi code.** Repo: `assistant-ui` · Product: **Idx Chat** · Gate: **PASS** (E01).

## Đọc theo vai trò

| Vai trò | Đọc trước |
| --- | --- |
| PO / reviewer | [spec-intake.md](./spec-intake.md) → [product/overview.md](./product/overview.md) |
| FE implementer | [product/assistant-ui-guide.md](./product/assistant-ui-guide.md) → [stories/backlog.md](./stories/backlog.md) E02 |
| BFF / adapter | [product/bff-api.md](./product/bff-api.md) → [product/modular-rag-integration.md](./product/modular-rag-integration.md) |
| Auth | [product/auth-backend.md](./product/auth-backend.md) → E08 packet |
| DevOps | [product/deployment.md](./product/deployment.md) → E07 packet |
| Security review | [product/security.md](./product/security.md) → [product/constraints.md](./product/constraints.md) |

## Kiến trúc tóm tắt

```text
Browser (user-chat)
  → assistant-ui Thread + LocalRuntime + ModularRagAdapter
  → BFF /api/chat/* + /api/auth/*
  → auth-api + PostgreSQL (user identity)
  → ModularRAG gateway (SSE, X-API-Key) — KHÔNG SỬA
  → PostgreSQL chat_threads / chat_messages (cross-device UI)
```

| Tầng | Công nghệ | Doc |
| --- | --- | --- |
| UI gốc | [assistant-ui.com](https://www.assistant-ui.com/) | [assistant-ui-guide.md](./product/assistant-ui-guide.md) |
| User app | Next.js 15 `apps/user-chat` | [user-chat.md](./product/user-chat.md) |
| Auth | Hono `apps/auth-api` + Postgres | [auth-backend.md](./product/auth-backend.md) |
| Admin | Next.js `apps/admin` (staff SSO) | [admin.md](./product/admin.md) |
| LLM/RAG | ModularRAG `:8030` | [backend-contract.md](./product/backend-contract.md) |

## Product contract (15 files)

| File | Nội dung |
| --- | --- |
| [overview.md](./product/overview.md) | Vision, surfaces, monorepo layout |
| [assistant-ui-guide.md](./product/assistant-ui-guide.md) | **Gốc UI**, runtime, epic → component |
| [user-chat.md](./product/user-chat.md) | Features Phase 1–2 |
| [admin.md](./product/admin.md) | Operator scope |
| [bff-api.md](./product/bff-api.md) | Route handlers user + admin |
| [modular-rag-integration.md](./product/modular-rag-integration.md) | SSE + adapter rules |
| [auth-layer.md](./product/auth-layer.md) | Auth tóm tắt |
| [auth-backend.md](./product/auth-backend.md) | auth-api API, Google, DB |
| [storage-layer.md](./product/storage-layer.md) | Server thread sync (0021) |
| [security.md](./product/security.md) | S1–S10, go-live checklist |
| [constraints.md](./product/constraints.md) | Không sửa ModularRAG BE |
| [backend-contract.md](./product/backend-contract.md) | Gateway APIs có sẵn |
| [voice.md](./product/voice.md) | `packages/voice-input` |
| [deployment.md](./product/deployment.md) | Docker, env, ports |
| [README.md](./product/README.md) | Index + update rules |

## Epics & thứ tự code

| Epic | Mô tả | Status | Packet |
| --- | --- | --- | --- |
| E01 | Docs bootstrap | **done** | [E01](./stories/epics/E01-docs-bootstrap/) |
| E02 | Chat MVP | **implemented** | [E02](./stories/epics/E02-user-chat-mvp/) |
| E08 | Email + Google + `idx_session` cookie | **implemented** | [E08](./stories/epics/E08-auth-api/) |
| E03 | Server threads + sidebar | **implemented** | [E03](./stories/epics/E03-thread-persistence/) |
| E07 | `AUTH_REQUIRED` + compose prod | **implemented** | [E07](./stories/epics/E07-sso-hardening/) * |
| E04 | Voice input | implemented | [E04](./stories/epics/E04-voice-input/) |
| E05 | RAG toolbar | implemented | [E05](./stories/epics/E05-rag-toolbar/) |
| E06 | Admin app | implemented | [E06](./stories/epics/E06-admin-app/) |

\* Folder `E07-sso-hardening` giữ tên cũ; scope = JWT gate (không portal SSO user).

```text
E02 → E08 (email + Google) → E03 (server threads) → (E04|E05|E06) → E07
```

## Decisions (0008–0021)

| ID | Chủ đề |
| --- | --- |
| 0008 | Monorepo pnpm + Turborepo |
| 0009 | Không ChatBotUI |
| 0010 | BFF split USER / ADMIN keys |
| 0011 | `conversation_id` = `userId:uuid` |
| 0012 | Voice shared package |
| 0013 | SSO portal — **superseded** |
| 0014 | Admin staff SSO + IP allowlist |
| 0015 | Compose cutover chatbot-ui |
| 0016 | Không sửa ModularRAG BE |
| 0017 | auth-api riêng + Google |
| 0018 | BFF cookie proxy, stack chốt |
| 0019 | Tên **Idx Chat**, naming convention |
| 0020 | Auth **email + Google** (cả hai v1) |
| 0021 | **Cross-device** thread storage (Postgres) |

## Naming convention (0019)

| Loại | Giá trị |
| --- | --- |
| Product | **Idx Chat** |
| Monorepo package | `idx-chat` (root), `@idx/*` apps |
| Compose | `idx-chat-user`, `idx-chat-admin` |
| Cookie | `idx_session`, `idx_refresh` |
| Thread DB | `chat_threads`, `chat_messages` in `idx_auth` |
| Optional cache | `idx-chat-cache` (IndexedDB) |
| Auth DB | `idx_auth` |

## Harness & proof

- [TEST_MATRIX.md](./TEST_MATRIX.md) — behavior → proof
- [ARCHITECTURE.md](./ARCHITECTURE.md) — layering
- [GLOSSARY.md](./GLOSSARY.md) — terms
- CLI: `.\scripts\bin\harness-cli.exe query matrix`

## PO overrides

[Xem spec-intake PO Override Log](./spec-intake.md#po-override-log)