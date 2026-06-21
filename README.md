# PersonaProbe

PersonaProbe runs Browserbase/Stagehand UI-agent probes against target websites, records failures with Sentry context, and can trigger an autofix workflow in the separate website repo.

## Local setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:seed
npm run dev
```

The local MVP uses SQLite:

```bash
DATABASE_URL="file:./dev.db"
```

## Autofix PR flow

PersonaProbe does not clone or edit target website repositories. When a failed test case triggers **Create Fix PR**, PersonaProbe:

1. Collects failure evidence from the TestCase, Run, Persona, Browserbase session metadata, Sentry trace metadata, and action trace.
2. Redacts sensitive fields and stores a `FixAttempt`.
3. Creates a signed fix-context URL.
4. Dispatches a GitHub Actions workflow in the configured target website repo.

Required env vars:

```bash
GITHUB_TOKEN=
PERSONAPROBE_APP_URL=
FIX_CONTEXT_SECRET=
```

`GITHUB_TOKEN` should be server-only and scoped to the target website repo with permission to trigger Actions workflows.

`PERSONAPROBE_APP_URL` must be publicly reachable by GitHub Actions. `localhost` will not work for the full workflow unless you use a public tunnel.

`FIX_CONTEXT_SECRET` signs fix-context URLs. Generate one with:

```bash
openssl rand -hex 32
```

## Target repo workflow

Add a workflow like `examples/personaprobe-autofix.yml` to the target website repo at:

```txt
.github/workflows/personaprobe-autofix.yml
```

Then configure a Project in PersonaProbe with:

- target URL
- GitHub owner
- GitHub repo
- base branch
- workflow file name

## Deployment note

Vercel can host the Next.js app, but the local SQLite database is not suitable for durable Vercel writes. For a production deployment, use a hosted database and update the Prisma datasource accordingly.
