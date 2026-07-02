# US-023 One-command Docker deployment

## Status

implemented

## Lane

normal

## Product Contract

An operator with an existing root `.env` or `.env.prod` can build and start the production stack on Windows or Linux with one Docker Compose command and without installing Node.js or pnpm on the host.

## Relevant Product Docs

- `docs/product/deployment.md`
- `HUONG_DAN_DOCKER.md`

## Acceptance Criteria

- `docker compose -f docker-compose.prod.yml up -d --build` is the canonical production command on Windows and Linux.
- `.env` and `.env.prod` are optional inputs; `.env.prod` takes precedence when both exist.
- Startup stops before application services when JWT, service secret, or gateway keys are missing.
- Existing internal Docker URLs, healthchecks, and persistent MongoDB volume remain unchanged.

## Design Notes

- Compose `env_file` long syntax provides cross-platform optional file loading.
- `config-check` validates required runtime configuration before `idx-api` starts.
- Container commands normalize the dev `JWT_SECRET` and production `IDX_JWT_SECRET` names at runtime.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | N/A — Compose configuration only |
| Integration | Rendered Compose config contains normalized commands and service dependencies |
| E2E | Config-check succeeds with a valid env and fails when required values are absent |
| Platform | Same Docker command documented for Windows and Linux |
| Release | Application healthchecks remain present |

## Harness Delta

No Harness policy change.

## Evidence

- `docker compose -f docker-compose.prod.yml config --quiet` — passed with Docker Compose v5.1.3.
- `docker compose -f docker-compose.prod.yml run --rm --no-deps config-check` — accepted valid values.
- The same config-check command with all required values blank exited non-zero with the expected JWT validation error.
