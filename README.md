# FlowProof

FlowProof is a pre-production UI QA tool that uses AI personas to find confusing, inaccessible, or fragile user flows before real users encounter them. Developers define a target page, task, and success criteria; FlowProof runs that flow across behavioral personas, records evidence with Browserbase/Stagehand and Sentry context, and can trigger an autofix workflow in the target website repo.

## Local setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed
npm run dev
```

FlowProof uses Prisma with Postgres. For local development, use any local or hosted Postgres database and set:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=require"
```

For a fast hosted option, create a Neon or Supabase Postgres database and paste its connection strings into `.env`. With Supabase, use the transaction pooler connection string for `DATABASE_URL`. Use the direct connection string for `DIRECT_URL`; if Vercel cannot reach the direct host, use Supabase's session pooler connection string for `DIRECT_URL`.

## Autofix PR flow

FlowProof does not clone or edit target website repositories. When a failed test case triggers **Create Fix PR**, FlowProof:

1. Collects failure evidence from the TestCase, Run, Persona, Browserbase session metadata, Sentry trace metadata, and action trace.
2. Redacts sensitive fields and stores a `FixAttempt`.
3. Creates a signed fix-context URL.
4. Dispatches a GitHub Actions workflow in the configured target website repo.

Required env vars:

```bash
DATABASE_URL=
DIRECT_URL=
GITHUB_TOKEN=
FLOWPROOF_APP_URL=
FIX_CONTEXT_SECRET=
```

`GITHUB_TOKEN` should be server-only and scoped to the target website repo with permission to trigger Actions workflows.

`FLOWPROOF_APP_URL` must be publicly reachable by GitHub Actions. `localhost` will not work for the full workflow unless you use a public tunnel. Existing deployments can continue using `PERSONAPROBE_APP_URL`.

`FIX_CONTEXT_SECRET` signs fix-context URLs. Generate one with:

```bash
openssl rand -hex 32
```

## Target repo workflow

Add a workflow like `examples/flowproof-autofix.yml` to the target website repo at:

```txt
.github/workflows/flowproof-autofix.yml
```

Then configure a Project in FlowProof with:

- target URL
- GitHub owner
- GitHub repo
- base branch
- workflow file name

## Deployment note

Vercel can host the Next.js app. Add `DATABASE_URL` and `DIRECT_URL` in Vercel before deploying for a working app. During `npm run build`, FlowProof runs `prisma migrate deploy` and seeds the default personas when `DATABASE_URL` is configured. If Supabase's direct host is unreachable from Vercel, the build script retries migrations through the Supabase session pooler derived from `DATABASE_URL`.
