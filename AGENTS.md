# AGENTS.md

Guidance for AI coding agents (Claude Code, Copilot, Cursor, etc.) working in this repository. For human onboarding, see `README.md` (in Portuguese).

## Stack

NestJS (TypeScript) + Prisma + PostgreSQL/PostGIS, run via Docker Compose. Node.js 22.

## Setup

```bash
npm install
npm run prisma:generate
npm run db:up          # postgres only, via docker compose
npm run prisma:migrate
npm run start:dev
```

Full stack (API + DB) in Docker: `npm run docker:up`.

## Commands

```bash
npm run lint            # ESLint, --fix
npm run format           # Prettier --write
npm run build            # nest build (also the type-check)
npm test                 # unit tests (Jest)
npm run test:e2e         # e2e tests (Jest, needs a running DB)
npm run prisma:generate  # regenerate Prisma Client after schema changes
npm run prisma:migrate   # create + apply a migration
```

Run `lint`, `build`, and `test` before considering any change done — this matches the repo's own pre-PR checklist and the CI workflows in `.github/workflows/`.

## Architecture

Features live under `src/modules/<feature>/`, split by layer:

```
src/modules/<feature>/
  domain/         entities, repository interfaces — no Nest/Prisma/HTTP imports
  application/    use cases (e.g. CreateUserUseCase) — orchestrate domain + repository ports
  infra/          concrete implementations (e.g. PrismaUserRepository)
  presentation/   controllers + DTOs — HTTP only, no business logic
  <feature>.module.ts
```

Rules:

- Controllers parse/validate HTTP input (DTOs) and call a use case. No business logic in controllers.
- Use cases depend on repository interfaces (ports), not on Prisma directly.
- Prisma access is confined to `infra/`.
- Prefer several small, single-responsibility files over one large one.
- New controllers get Swagger decorators (`@ApiTags`, `@ApiOkResponse`, etc.) — verify `/docs` still reflects the change.

## Database

Schema lives in `prisma/schema.prisma`. After changing it, run `npm run prisma:migrate` to generate and apply a migration — don't hand-edit generated migration SQL.

## Conventions

- Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, ...) — enforced by the PR Title Lint workflow and used as the squash-merge commit message.
- New PRs use `.github/PULL_REQUEST_TEMPLATE.md` — fill in what changed, why, and testing steps rather than leaving placeholders.
- Formatting is Prettier-owned (single quotes, trailing commas — see `.prettierrc`); don't hand-format against it.
