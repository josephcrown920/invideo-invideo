# Lantern Foundation Inventory

## Repository status

- Working tree: `/briefs/brief-2/lantern`.
- GitHub repository `josephcrown920/invideo-agent-` was **NOT pushed**; this environment cannot authenticate to GitHub.
- In this tree, the files still have the names `gitignore.txt` and `env.example`; after copying, they must be renamed to `.gitignore` and `.env.example`.

## Created packages

- `@lantern/types` — Shared domain and API types.
- `@lantern/config` — Environment and application configuration.
- `@lantern/db` — Drizzle database client, schema, and seed support.
- `@lantern/providers` — Generation-provider contracts, routing, mocks, and live-adapter hooks.
- `@lantern/storage` — Object-storage abstraction and implementation.
- `@lantern/queue` — Job-queue abstraction and implementation.
- `@lantern/credits` — Credit accounting and ledger operations.
- `@lantern/auth` — Authentication contracts and development authentication.
- `@lantern/observability` — Logging and observability helpers.
- `@lantern/editor` — Editor and timeline domain helpers.
- `@lantern/agent` — Agent orchestration and agent-facing operations.

## Created apps

- `apps/api` — Hono API server exposing health, project, asset, timeline, job, agent, billing, brand, template, stock, caption, lock, and development routes.
- `apps/worker` — Background job worker process.
- `apps/web` — Next.js web application with the landing/project-start UI.

## API routes

- `GET /health`
- Product routes under `/v1` (for example, `GET /v1/projects`):
  - Project routes under `/v1/projects`
  - Asset routes under `/v1/assets`
  - Timeline routes under `/v1/timelines`
  - Job routes under `/v1/jobs`
  - Agent routes under `/v1/agent`
  - Billing routes under `/v1/billing`
  - Brand routes under `/v1/brand`
  - Template routes under `/v1/templates`
  - Stock routes under `/v1/stock`
  - Caption routes under `/v1/captions`
  - Lock routes under `/v1/locks`
  - Development routes under `/v1/dev`
- `POST /v1/dev/token`

See each route module in `apps/api/src/routes/` for the exact methods, parameters, and response shapes.

## Extension points

- `GenerationProvider` — Connect image, video, audio, caption, and related generation vendors.
- `ObjectStore` — Replace local/file storage with S3-compatible or another object store.
- `JobQueue` — Replace the development queue with Redis, a hosted queue, or another worker backend.
- `AuthProvider` — Replace development JWT authentication with a production identity provider.
- `CreditLedger` — Replace the development ledger with production billing/credit accounting.

## Live versus stubbed

- Mock providers are always available for local development.
- Live provider adapters currently throw `not_wired` until the relevant vendor SDKs and credentials are filled in.
- Rendering degrades when `ffmpeg` is missing; it does not provide the full production render path without ffmpeg.
- Stock integration is search-only; downloading/licensing/fulfillment is not connected.
- Publishing OAuth tables exist, but publishing connectors do not.
- The Stripe billing driver is not implemented; development uses the dev ledger only.
- The Clerk auth driver is not implemented; development uses dev JWT only.

## How to run

```bash
cd /briefs/brief-2/lantern
cp env.example .env
pnpm install
pnpm dev
```

Run the API, worker, or web app individually with the corresponding workspace commands in `package.json`. Start the local database/services first when using the Docker Compose setup:

```bash
docker compose up -d
```

Use mock providers and dev JWT/ledger settings for a local smoke test; configure `.env` before attempting any live integrations.

## Follow-up commit with GitHub credentials

On a machine that can authenticate to GitHub, verify the tree and tests, confirm `.gitignore` and `.env.example` are tracked while secrets are excluded, create a commit, add the GitHub remote for `josephcrown920/invideo-agent-`, and push the intended branch. Do not commit `.env` or credentials. Then replace the explicitly documented development adapters with configured production integrations in separate, reviewable commits.
