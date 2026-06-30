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