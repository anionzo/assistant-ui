# E07 Validation

- [x] Integration: 401 without `idx_session` on `POST /api/chat/stream` when `AUTH_REQUIRED=true`
- [x] Integration: 401 without session on `POST /api/voice/stream` when `AUTH_REQUIRED=true`
- [x] Integration: authenticated chat prefixes `conversation_id` with `userId`
- [x] Integration: `GET /api/threads` returns 401 when `AUTH_REQUIRED=true` and no cookie
- [x] E2E: two users cannot read each other's threads (404) — idx-api unit test
- [x] E2E: logout then re-login restores same thread list from server — e2e-smoke E03
- [x] Platform: `docker-compose.prod.yml` healthchecks for `idx-chat-user`, `idx-api`, `mongo`
- [x] Release: Phase 1 auth gate items in security.md checklist
- [x] Document: S1 residual risk accepted (0016 — no ModularRAG BE change)

```bash
pnpm --filter @idx/user-chat test
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml run --rm --no-deps config-check
docker compose -f docker-compose.prod.yml up -d --build
```
