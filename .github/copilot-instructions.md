# GitHub Copilot Coding Agent Onboarding: veritable-ui

## Repository Summary
- **Purpose:** Frontend UI for Veritable SSI platform, managing supply chain connections, credential issuance, and queries. Integrates with veritable-cloudagent, Keycloak, IPFS, and external registries (Companies House, NY State, OpenCorporates, iPiD).
- **Type:** Node.js/TypeScript web application, TSOA REST API, HTMX, JSX templates, Dockerized, with Playwright, Mocha, Chai, Sinon for testing.
- **Size:** Medium-large, ~20 top-level folders, extensive source, test, and infra files.
- **Languages/Frameworks:** TypeScript, Node.js (>=22), TSOA, Express, HTMX, @kitajs/html, SWC, Knex, Playwright, Mocha, ESLint, Prettier.

## Build, Test, and Validation Instructions
- **Always run `npm install` before building.**
- **Build:**
  - `npm run build` (generates OpenAPI spec/routes, compiles with SWC, outputs to `build/`)
- **Dev Server:**
  - `npm run dev` (watches for changes, starts server with pretty logs)
  - `npm run dev:init` (runs initialization script for issuance records)
- **Database:**
  - Migrate: `npm run db:migrate`
  - Create migration: `npm run db:cmd -- migrate:make migration_name -x ts`
  - Knex config: `knexfile.js`, migrations in `src/models/db/migrations/`
- **Lint/Format:**
  - Lint: `npm run lint`
  - Lint fix: `npm run lint:fix`
- **Unit Tests:** `npm run test:unit` (Mocha, Chai, Sinon, tests collocated with source)
- **Integration Tests:** `npm run test:integration` (Testcontainers, helpers in `test/integration/`, env in `test/test.env`)
- **E2E Tests:**
  - Install Playwright: `npx playwright install`
  - Run: `npm run test:e2e`
  - UI mode: `npm run test:playwright` (browser window)
- **Docker Compose:**
  - Local dev: `docker compose up -d --build` (brings up UI, Keycloak, IPFS, Postgres, SMTP, WireMock)
- **Environment Variables:**
  - Defined in `.env` and validated in `src/env/`. Key envs: COMPANY_PROFILE_API_KEY, DB_*, CLOUDAGENT_ADMIN_ORIGIN, EMAIL_TRANSPORT, IDP_CLIENT_ID, etc. See README for full list.
  - For SMTP, set EMAIL_TRANSPORT=SMTP_EMAIL and configure SMTP_* vars.
- **External Services:**
  - Companies House, NY State, OpenCorporates, iPiD: API keys required for some, see README for setup.

## Project Layout & Key Files
- **Root Files:**
  - `README.md`, `Dockerfile`, `docker-compose.yml`, `package.json`, `tsconfig.json`, `tsoa.json`, `eslint.config.mjs`, `.prettierrc`, `knexfile.js`, `playwright.config.ts`, `.depcheckrc`, `.gitignore`, `.swcrc`
- **Source:** `src/` (main code: index.ts, server.ts, routes.ts, controllers/, services/, models/, views/, env/, utils/, errors.ts, logger.ts, ioc.ts, init.ts)
- **Build Output:** `build/` (compiled JS)
- **Tests:** `test/unit/`, `test/integration/`, `test/e2e/`, `test/test.env`, helpers, wiremock mocks
- **Public Assets:** `public/` (fonts, images, scripts, styles)
- **Docker:** `docker/` (Keycloak config, cloudagent.env)
- **CI/CD:**
  - GitHub Actions: `.github/workflows/test.yml`, `release.yml`, etc. (run lint, tests, build Docker image, release)
  - All PRs/commits validated by static checks, unit/integration/e2e tests, Docker build.

## Validation & Troubleshooting
- **Common Issues:**
  - Always run `npm install` before build/test.
  - Ensure all required env vars are set, especially API keys and DB credentials.
  - For Playwright, run `npx playwright install` before e2e tests.
  - For database errors, check migrations and env vars.
  - For SMTP, ensure EMAIL_TRANSPORT and SMTP_* vars are set for email features.
- **Explicit Validation Steps:**
  - Run `npm run lint` and all test scripts before PR/commit.
  - Validate with Docker Compose for local dev.
  - Check API docs at `http://localhost:3000/api-docs` and Swagger at `/swagger`.
- **CI Checks:**
  - Lint, unit/integration/e2e tests, Docker build, release pipeline.

## Agent Guidance
- Trust these instructions for build, test, and validation. Only search if information is missing or errors occur.
- For new features, changes, or bugfixes, update/add tests in `test/unit/`, `test/integration/`, or `test/e2e/` as appropriate.
- For environment/config changes, update `src/env/` and document in README if needed.
- For API changes, update OpenAPI spec via TSOA and validate with Swagger UI.
- For database changes, always create new migration files, do not edit existing ones.

## Copilot PR Review Instructions
You are reviewing as a **critical software engineering peer**. Read the PR description, the diff, and repository docs/configs. Think step‑by‑step, cite file paths/lines, and propose concrete fixes or commits. Assume a human will validate before merge.

### Repository guard‑rails & constraints
- Language/stack standards: TypeScript, Node.js (>=22), TSOA, HTMX, @kitajs/html, SWC. See `/README.md`, `/package.json`.
- Style/lint rules: enforced by CI (`npm run lint`, ESLint, Prettier, TypeScript checks). Treat violations as issues.
- Security baseline: OWASP Top 10, secret scanning, dependency updates must be pinned & reviewed. See `.github/workflows/test.yml`, Dockerfile, and SOPS for secrets.
- Testing thresholds: **unit/integration/e2e tests required**; regression below current coverage is a **Must‑Fix**. See `test/unit/`, `test/integration/`, `test/e2e/`, CI coverage artefacts.
- Performance budgets: UI and API endpoint P95 latency must not worsen by >10% without justification.
- Backwards compatibility required unless explicitly stated (REST endpoints, DB schema, UI contracts).

### What to inspect (exhaustive checklist)
1. **Correctness & API contracts** — Inputs/outputs, edge cases, error handling, idempotency. Check OpenAPI spec (`/build/swagger.json`, `/tsoa.json`).
2. **Security** — Secrets, authZ/authN flows, crypto, unsafe deserialisation, injection, path traversal, SSRF, XSS. Validate env usage (`src/env/`), Docker secrets, SOPS.
3. **Data & schema** — Migrations reversible; zero‑downtime; index/constraints; data retention. See `src/models/db/`, `knexfile.js`.
4. **Concurrency & reliability** — Timeouts, retries, circuit‑breakers, race conditions, deadlocks.
5. **Performance** — Hot paths; N+1; allocations; cache usage; pagination; batch sizes; UI responsiveness.
6. **Testing** — Adequacy, flakiness, negative tests, mocking correctness, fixture realism; **note precise uncovered cases**. See `test/unit/`, `test/integration/`, `test/e2e/`.
7. **Observability** — Metrics, logs (no PII), trace spans; meaningful error messages. See `pino` usage, error handling in `src/`.
8. **Maintainability** — Naming, cohesion, coupling, duplication, complexity; public surface area minimal.
9. **Dependencies & licences** — Added/updated deps necessary, pinned, licence compatible; supply‑chain risk noted. See `package.json`.
10. **Infra/DevEx** — CI steps, build reproducibility, container/Helm/K8s changes, resource requests/limits. See `.github/workflows/`, `Dockerfile`, Helm charts.
11. **UI/UX** — Accessibility (WCAG), responsiveness, semantic HTML, ARIA roles, keyboard navigation, error states, loading indicators, user feedback, cross-browser compatibility.
12. **Visual regression** — If UI changes, ensure Playwright or other e2e tests cover visual/interaction changes. Suggest new test cases for major UI changes.

### Scoring rubric (weightings)
- Correctness 25%
- Security 15%
- Testing 15%
- Maintainability 15%
- Performance 10%
- Integration/Infra 10%
- UI/UX 10%

Provide a **score out of 10** and a short reason per category. Flag any **Must‑Fix** items (blockers) vs **Should‑Fix** (non‑blocking) vs **Nice‑to‑Have**.

### Required output format
1. **Executive summary (≤10 lines):** what changed, key risks, merge recommendation.
2. **Blockers (Must‑Fix):** bullet list with file:line and rationale.
3. **Targeted suggestions:** concrete patches or pseudo‑diffs.
4. **Test gap analysis:** missing cases and suggested test names (unit, integration, e2e, visual regression).
5. **Integration risks:** API/DB/infra implications, rollout/rollback notes.
6. **Scores:** rubric table with /10 per category + overall.
7. **Release notes draft:** 3–6 bullets for CHANGELOG.

### Additional context you can use
- Repo docs: `/README.md`, `/docs`, `/ARCHITECTURE.md`
- CI logs and coverage report artefacts
- Service contracts: OpenAPI spec (`/build/swagger.json`, `/tsoa.json`), Helm values, K8s manifests
- UI/UX: Playwright e2e tests, accessibility reports, browser compatibility notes

**Be strict** if coverage drops, performance budgets are breached, security posture weakens, UI/UX regresses, or backwards compatibility breaks without justification. Always suggest the minimal change that resolves the issue.

---
For further details, see `README.md`. Use the provided Docker Compose file for orchestration and testing. All major commands and validation steps are documented above for efficient onboarding and minimal exploration.
