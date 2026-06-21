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
5. Serves the signed FixContext to GitHub Actions and marks the `FixAttempt` as `CONTEXT_FETCHED`.
6. Receives the GitHub Actions callback with `PR_OPENED` or `FAILED`, then stores the PR URL or error for the run dashboard.

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

The example workflow fetches the signed FixContext, commits a placeholder evidence file at `flowproof-fix-evidence/<fixAttemptId>.md`, opens a draft PR, and calls back to FlowProof with the PR URL. This proves the end-to-end handoff before a real coding agent is wired in.

The target repo workflow needs these permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
```

## Autofix demo checklist

1. Deploy FlowProof somewhere GitHub Actions can reach and set `FLOWPROOF_APP_URL` to that public origin.
2. Set `DATABASE_URL`, `DIRECT_URL`, `GITHUB_TOKEN`, and `FIX_CONTEXT_SECRET` in FlowProof.
3. Add `.github/workflows/flowproof-autofix.yml` to the target repo using `examples/flowproof-autofix.yml`.
4. Create or choose a FlowProof Project that points at the target repo and workflow file.
5. Run a probe, open the run detail page, and click **Create Fix PR** on a failed test case.
6. Watch the failed test case move through `WORKFLOW_TRIGGERED`, `CONTEXT_FETCHED`, and `PR_OPENED`. The dashboard will show the draft PR link after the callback lands.

The FixContext endpoint is `GET /api/fix-context/:id?token=<signed-token>`. The callback endpoint is `POST /api/fix-attempts/:id/callback` with `Authorization: Bearer <signed-token>` and a JSON body like:

```json
{
  "status": "PR_OPENED",
  "prUrl": "https://github.com/owner/repo/pull/123",
  "githubWorkflowRunId": "1234567890",
  "evidence": {
    "branch": "flowproof/autofix-fixAttemptId",
    "commitSha": "abc123",
    "workflowRunUrl": "https://github.com/owner/repo/actions/runs/1234567890"
  }
}
```

## Deployment note

Vercel can host the Next.js app. Add `DATABASE_URL` and `DIRECT_URL` in Vercel before deploying for a working app. During `npm run build`, FlowProof runs `prisma migrate deploy` and seeds the default personas when `DATABASE_URL` is configured. If Supabase's direct host is unreachable from Vercel, the build script retries migrations through the Supabase session pooler derived from `DATABASE_URL`.
