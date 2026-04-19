# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DG Notas — plataforma de emissão de notas fiscais para infoprodutores, com suporte humano. Comunicação com o usuário em pt-BR.

## Monorepo layout

pnpm workspace with two packages defined in [pnpm-workspace.yaml](pnpm-workspace.yaml):

- [`backend/`](backend) — `@dgnotas/backend`: Express + TypeScript API (port 4000)
- [`frontend/`](frontend) — `@dgnotas/frontend`: React 18 + Vite + TypeScript + Tailwind (port 5173)

Root scripts fan out with `pnpm -r`. Always run commands from the repo root unless targeting a single workspace.

## Commands

```bash
pnpm install                  # install all workspaces
pnpm dev                      # run backend + frontend in parallel
pnpm dev:backend              # backend only (tsx watch, http://localhost:4000)
pnpm dev:frontend             # frontend only (vite, http://localhost:5173)
pnpm build                    # build both (tsc for backend, tsc -b && vite build for frontend)
pnpm typecheck                # tsc --noEmit in both workspaces
pnpm start:backend            # run compiled backend from dist/
```

Scoped workspace commands: `pnpm --filter @dgnotas/backend <script>` / `pnpm --filter @dgnotas/frontend <script>`.

There is no test runner or linter configured yet — do not invent one. If tests are needed, ask first.

## Backend architecture

Entry [backend/src/index.ts](backend/src/index.ts) loads `dotenv/config`, builds the app via `createApp()`, and listens on `env.port`.

[backend/src/app.ts](backend/src/app.ts) is the single composition root: applies `helmet`, `cors` (origin from `env.frontendOrigin`), `express.json({ limit: '1mb' })`, `morgan`, mounts routers, then the error handler last. Add new routes by creating a router under [backend/src/routes/](backend/src/routes/) and registering it in `createApp`.

Config lives in [backend/src/config/env.ts](backend/src/config/env.ts) — a single frozen `env` object reading from `process.env`. Copy `backend/.env.example` to `backend/.env` for local dev. Known vars: `NODE_ENV`, `PORT`, `FRONTEND_ORIGIN`.

TS config: `target: ES2022`, `module: commonjs`, `moduleResolution: nodenext`, strict on. Dev uses `tsx watch`; build emits to `dist/` via `tsc`.

Note: the backend today is a flat Express app (routes/middleware/auth). The [dgnotas-backend skill](.claude/skills/dgnotas-backend/SKILL.md) defines the target Clean Architecture (domain / application / infrastructure / interface) that **new code** should follow. Existing flat code is not to be refactored unless the user asks explicitly.

## Frontend architecture

Single-page app. [frontend/src/main.tsx](frontend/src/main.tsx) mounts [frontend/src/App.tsx](frontend/src/App.tsx), which currently renders only [frontend/src/pages/LandingPage.tsx](frontend/src/pages/LandingPage.tsx). Landing sections live as standalone components in [frontend/src/components/landing/](frontend/src/components/landing/) (Hero, Features, HowItWorks, Pricing, FAQ, etc.).

Vite config [frontend/vite.config.ts](frontend/vite.config.ts) sets:
- Alias `@` → `src/`
- Dev proxy `/api/*` → `http://localhost:4000` (path rewritten to strip `/api`). Frontend code should call the backend via `/api/...` paths, not absolute URLs.

Styling uses **Tailwind v3** (`@tailwind base/components/utilities` in [frontend/src/styles/index.css](frontend/src/styles/index.css)) plus hand-written CSS utilities. The brand palette lives as CSS variables on `:root` (`--ink`, `--accent`, `--blue`, `--line`, etc.) — reference them via `var(--token)` in custom CSS, and reuse the pre-built utility classes (`.btn-primary`, `.btn-secondary`, `.card`, `.badge`, `.grid-bg`, `.hero-mesh`, `.reveal`, `.gradient-text`, `.plan-card.featured`, etc.) instead of redefining styles inline.

Note: the [dgnotas-ui skill](.claude/skills/dgnotas-ui/SKILL.md) references a Tailwind v4 `@theme` block, but the code is still on v3 with `:root` CSS variables. Treat the skill's TOKENS/COMPONENTS/VOICE guidance as authoritative for values, tone, and patterns, but translate token references to the v3 setup actually in the repo.

## Brand & UI

For any visual work (new component, page, landing section, styling, microcopy, form, dashboard, badge, button), follow the [.claude/skills/dgnotas-ui/](.claude/skills/dgnotas-ui/) skill — it is the source of truth for tokens, canonical components, and tone of voice. Key non-negotiables from that skill:

- Never hardcode hex values; always reference a token (CSS variable in this repo).
- Only three fonts: Geist (sans), Instrument Serif (destaque italic, wordmark — never body copy or product UI), Geist Mono (labels/badges, always CAPS with `letter-spacing: 0.02em`).
- Border-radius only from the system scale: 16px cards, 8px buttons, 999px pills/badges.
- If a needed token/state is missing, stop and ask rather than inventing.

## Backend architecture guide

For any backend work on **new code** (entity, value object, use case, repository, adapter, migration, route handler wired through a use case), follow the [.claude/skills/dgnotas-backend/](.claude/skills/dgnotas-backend/) skill — source of truth for Clean Architecture, PostgreSQL conventions, and testing strategy. Key non-negotiables from that skill:

- Dependencies point inward: `interface → infrastructure → application → domain`. Domain is pure TypeScript, zero framework/ORM imports.
- Business rules live in entities and use cases — never in controllers or repositories.
- Every use case and every repository method takes `companyId` (multi-tenancy). Every business table has `empresa_id NOT NULL` + index.
- Custom domain errors only — never `throw new Error('...')`. Controllers translate error codes to HTTP status.
- Monetary values as `NUMERIC(15, 2)`, CNPJ/CPF/chave de acesso as `VARCHAR` with length check, UUID PKs, `TIMESTAMPTZ` everywhere.
- If a needed decision is still open (HTTP framework, ORM vs raw SQL, event strategy), stop and ask — the skill lists these in its `TODO` section.
