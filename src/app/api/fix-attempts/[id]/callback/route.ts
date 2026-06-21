import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { buildFixAttemptCallbackUpdate } from "@/lib/fix/fixAttemptCallbackUpdate";
import { parseFixAttemptCallbackPayload } from "@/lib/fix/fixAttemptStatus";
import { verifyFixContextToken } from "@/lib/fix/fixContextToken";
import { setSafeTags, withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withSentrySpan("fix.callback", { fix_attempt_id: id }, async () => {
    const token = getCallbackToken(request);
    const verifiedFixAttemptId = verifyFixContextToken(token);

    if (verifiedFixAttemptId !== id) {
      return NextResponse.json({ error: "Invalid fix-attempt callback token." }, { status: 401, headers: noStoreHeaders() });
    }

    const fixAttempt = await prisma.fixAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        testCaseId: true,
        status: true,
        fixContextToken: true,
        project: {
          select: {
            githubOwner: true,
            githubRepo: true
          }
        }
      }
    });

    if (!fixAttempt || fixAttempt.fixContextToken !== token) {
      return NextResponse.json({ error: "Fix attempt not found." }, { status: 404, headers: noStoreHeaders() });
    }

    const parsed = parseFixAttemptCallbackPayload(await safeJson(request));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStoreHeaders() });
    }

    setSafeTags({
      fix_attempt_id: fixAttempt.id,
      test_case_id: fixAttempt.testCaseId,
      github_owner: fixAttempt.project.githubOwner,
      github_repo: fixAttempt.project.githubRepo
    });

    const data = buildFixAttemptCallbackUpdate(fixAttempt.status, parsed.payload) as Prisma.FixAttemptUpdateInput;

    const updatedAttempt = await prisma.fixAttempt.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        prUrl: true,
        errorMessage: true,
        githubWorkflowRunId: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ fixAttempt: updatedAttempt }, { headers: noStoreHeaders() });
  });
}

function getCallbackToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, value] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() === "bearer" && value) {
    return value.trim();
  }

  return new URL(request.url).searchParams.get("token") || "";
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0"
  };
}
