# repository-harness

Turn any software repo into an agent-ready workspace.

`repository-harness` is a repository-level operating harness for Claude Code,
Codex, Cursor, and other coding agents. It gives agents the missing project
context they need before they change code: where to start, what the product
contract says, how risky the work is, what proof is required, and which
decisions future agents should inherit.

The app is what users touch. The harness is what agents touch.

## Why Star This Repo

Star this repo if you want practical, reusable patterns for making AI-assisted
software development more reliable, inspectable, and easier for humans to steer.

This project is exploring a simple idea:

> Coding agents do not only need better prompts. They need better repositories.

## The Problem

Most repos are built for humans reading code in a familiar codebase. Coding
agents usually enter with only a chat prompt and a shallow snapshot of files.
That leads to common failure modes:

- The agent edits code before understanding product intent.
- Important constraints live only in chat history or in someone's head.
- Validation expectations are vague or discovered too late.
- Architecture tradeoffs are repeated instead of inherited.
- Large requests do not get broken into reviewable story-sized work.

## The Harness Approach

A repository starts to have a harness when it helps an agent answer practical
engineering questions without relying only on chat history:

- What should I read first?
- What type of work is this?
- Which product contract does it affect?
- How risky is the change?
- What proof will show the work is done?
- What decision or lesson should future agents inherit?

In this repo, those answers live in:

- `AGENTS.md` — the stable agent shim with local project notes and Harness
  doc links.
- `docs/HARNESS.md` — the human-agent collaboration model.
- `docs/FEATURE_INTAKE.md` — tiny, normal, and high-risk work classification.
- `docs/ARCHITECTURE.md` — architecture discovery and boundary rules.
- `docs/TEST_MATRIX.md` — behavior-to-proof validation expectations.
- `docs/stories/` — story packets and backlog items.
- `docs/decisions/` — durable decisions and tradeoffs.
- `docs/templates/` — reusable spec, story, decision, and validation templates.

OpenAI describes this shift as an agent-first world where humans steer and
agents execute:

https://openai.com/index/harness-engineering/

## Install Harness Into A Project

From a target project directory, run:

```bash
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --yes
```

On Windows PowerShell, run:

```powershell
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.ps1"))) -Yes
```

If the target already has `AGENTS.md`, `docs/`, or `scripts/`, choose one:

```bash
# Update an existing Harness repo without moving existing files
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --merge --yes

# Back up and replace AGENTS.md, docs/, and scripts/
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --override --yes
```

```powershell
# Update an existing Harness repo without moving existing files
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.ps1"))) -Merge -Yes

# Back up and replace AGENTS.md, docs/, and scripts/
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.ps1"))) -Override -Yes
```

Use `--merge` when a project already has Harness and you want to append newly
added Harness files without moving the existing `AGENTS.md`, `docs/`, or
`scripts/` paths into backup. Existing files stay untouched; only missing
Harness files are created.

For older Harness installs whose `AGENTS.md` still contains the full generated
operating guide, refresh it into the small stable shim:

```bash
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --merge --refresh-agent-shim --yes
```

The refresh backs up the existing file. If it detects the old
Harness-generated guide, it replaces it with the shim. If the file appears
custom, it appends or updates a marked Harness block instead of overwriting the
project's local instructions.

If the project is driven with Claude Code, add `--claude`. Claude Code never
auto-loads `AGENTS.md`, so without this the installed harness is invisible to
fresh sessions. The flag installs (or refreshes) a `CLAUDE.md` whose marked
Harness block `@`-imports `AGENTS.md` and `docs/FEATURE_INTAKE.md` into every
session's context. An existing `CLAUDE.md` gets the block appended after a
backup; plain installs without the flag never touch `CLAUDE.md`:

```bash
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --claude --yes
```

Or install into a specific path:

```bash
curl -fsSL "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.sh?$(date +%s)" | bash -s -- --directory /path/to/project --yes
```

```powershell
& ([scriptblock]::Create((irm "https://raw.githubusercontent.com/hoangnb24/repository-harness/main/scripts/install-harness.ps1"))) -Directory C:\path\to\project -Yes
```

Use `--dry-run` on Bash or `-DryRun` on PowerShell to preview changes before
writing files.

The installer also downloads the prebuilt Harness CLI for the current platform,
verifies its `.sha256` checksum, and installs it at
`scripts/bin/harness-cli` on macOS/Linux or `scripts/bin/harness-cli.exe` on
Windows. The Rust CLI is the main Harness tool and stable command path.

Harness CLI release assets are published from tags by the
`Harness CLI Release` GitHub Actions workflow. The installer expects each
release to include `harness-cli-<platform>` and
`harness-cli-<platform>.sha256` assets for macOS arm64, macOS x64, Linux x64,
Linux arm64, and Windows x64. The Windows asset is
`harness-cli-windows-x64.exe` plus `harness-cli-windows-x64.exe.sha256`.

Merged pull requests are recorded in `CHANGELOG.md` by the
`Post-Merge Maintenance` workflow. When a merged PR changes the Rust CLI source,
schema, Cargo metadata, or CLI release packaging, that workflow bumps the CLI
patch version, updates `scripts/harness-cli-release-tag`, creates a
`harness-cli-v*` tag, and runs the Harness CLI release build for that tag.

## Try The Flow

The fastest way to understand the harness is to inspect the tiny demo:

- `docs/demo/README.md`: shows how a simple product idea becomes product docs,
  stories, validation expectations, and decisions before implementation starts.

A typical flow looks like this:

```text
human intent or product spec
  -> product contract
  -> feature intake
  -> story packet
  -> validation expectations
  -> implementation work
  -> decision or lesson captured for future agents
```

Implementation prompts do not go straight to code. They first pass through
feature intake, become story-sized work when needed, and then carry both product
validation and harness maintenance expectations.

## Tool Registry

The harness can use optional external tools (linters, code-graph servers,
deploy checks) without depending on any of them. You register a tool as a
provider of a *capability*, the harness scans whether it is actually present,
and a workflow step uses whatever is equipped — an absent tool is a clean skip,
never a failure.

```bash
# register a tool as a provider of a capability
scripts/bin/harness-cli tool register --name deploy-check --kind cli \
  --capability deploy-verification --command ./scripts/deploy-check.sh \
  --responsibility Verification --description "Verify deploy health before release"

# scan presence (writes present/missing/unknown)
scripts/bin/harness-cli tool check

# a step looks up what is equipped for a purpose
scripts/bin/harness-cli query tools --capability deploy-verification --status present
```

Kinds (`cli`, `binary`, `mcp`, `skill`, `http`) make it agent-generic: each
agent runtime uses what it can orchestrate. See `docs/TOOL_REGISTRY.md` for the
full model, the degrade ladder, and how to wire a tool into a flow step.

## Current State

**Idx Chat** — GPT-like FE for ModularRAG. **UI gốc: [assistant-ui.com](https://www.assistant-ui.com/)** + Next.js. Harness v0 + complete product docs (E01) + user-chat MVP (E02–E05, E07–E08) + admin RBAC (E06).

### Epics implemented

| Epic | Description | Proof |
|------|-------------|-------|
| E01 | Product docs | docs/product/* (15 files) |
| E02 | Chat MVP | vitest, SSE stream, BFF→gateway |
| E03 | Thread persistence | Server-side thread/message CRUD via auth-api |
| E04 | Voice input | Shared package, hidden in prod |
| E05 | RAG toolbar | Citations, pipeline selector, hidden in prod |
| E06 | Admin app + RBAC | Roles (ID 1-5), permissions (ID 10-53), JWT session, Google OAuth |
| E07 | Compose prod | docker-compose.prod.yml |
| E08 | Auth API | Email/password + Google OAuth, JWT, refresh rotation |

- Backend: ModularRAG gateway `:8030` (unchanged)
- Auth: `apps/auth-api` + PostgreSQL — email/password + Google + RBAC
- Explicit: does **not** use legacy ChatBotUI

### Run user-chat

```powershell
Copy-Item .env.example apps/user-chat/.env.local
pnpm install
pnpm --filter @idx/user-chat dev
```
User app at `http://localhost:3001`. Requires ModularRAG at `MODULAR_RAG_GATEWAY_URL`.

### Run admin

```powershell
Copy-Item .env.example apps/admin/.env.local
# Set ADMIN_SEED_EMAIL in auth-api/.env to auto-assign super_admin
pnpm --filter @idx/auth-api db:migrate
pnpm --filter @idx/auth-api dev
pnpm --filter @idx/admin dev
```
Admin at `http://localhost:3002/login`. Login via email/password or Google OAuth. First admin: register with `ADMIN_SEED_EMAIL` → auto-assigned super_admin role.

### Auth API

```powershell
Copy-Item .env.example apps/auth-api/.env
pnpm --filter @idx/auth-api db:migrate
pnpm --filter @idx/auth-api dev
```
Auth API at `http://localhost:4000`. JWT signed with HS256. Secret lives only in auth-api — BFFs verify via `/auth/me` API call, no local JWT verification needed.

### Validation

```powershell
pnpm --filter @idx/modular-rag-sdk typecheck
pnpm --filter @idx/user-chat typecheck
pnpm --filter @idx/admin typecheck
pnpm --filter @idx/auth-api typecheck
pnpm --filter @idx/modular-rag-sdk test
pnpm --filter @idx/user-chat test
pnpm --filter @idx/auth-api test
pnpm --filter @idx/user-chat build
```

## Product Sources

- [docs/DOC_MAP.md](docs/DOC_MAP.md) — **đọc trước** — index Idx Chat
- [docs/spec-intake.md](docs/spec-intake.md) — intake + PO defaults
- [docs/product/assistant-ui-guide.md](docs/product/assistant-ui-guide.md) — **gốc UI** assistant-ui
- [docs/product/](docs/product/) — product contract (15 files)
- [docs/stories/backlog.md](docs/stories/backlog.md) — epics E01–E08
- [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md) — proof map
- [docs/decisions/0008](docs/decisions/0008-monorepo-stack.md)–[0021](docs/decisions/0021-cross-device-thread-storage.md) — architecture, security, auth

## Repository Structure

```text
project/
  AGENTS.md
  README.md
  docs/
    HARNESS.md
    FEATURE_INTAKE.md
    ARCHITECTURE.md
    TEST_MATRIX.md
    HARNESS_BACKLOG.md
    product/
    stories/
    decisions/
    demo/
    templates/
  scripts/
    README.md
```

## Contributing

This project is early and benefits most from real-world agent failure cases,
example harness installs, docs improvements, and reusable workflow patterns.
See `CONTRIBUTING.md` for contribution ideas.

Useful contributions include:

- Show how the harness works in a real project.
- Add missing templates or improve existing ones.
- Propose validation patterns for different stacks.
- Share failures where an agent made the wrong change because the repo lacked
  context.
- Compare harness behavior across Claude Code, Codex, Cursor, and other tools.

## Share

If this idea resonates, please star the repo and share it with someone building
with coding agents.

Short description:

> An agent-ready repo harness for Claude Code, Codex, Cursor, and other coding
> agents: AGENTS.md, product contracts, story packets, validation matrix, and
> decision records.
