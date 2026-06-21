import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { buildFixContextResponse } from "@/lib/fix/fixContextResponse";
import { getStatusAfterContextFetch } from "@/lib/fix/fixAttemptStatus";
import { verifyFixContextToken } from "@/lib/fix/fixContextToken";
import type { FixContext } from "@/lib/fix/types";
import { setSafeTags, withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withSentrySpan("fix.serve_context", { fix_attempt_id: id }, async () => {
    const token = new URL(request.url).searchParams.get("token") || "";
    const verifiedFixAttemptId = verifyFixContextToken(token);

    if (verifiedFixAttemptId !== id) {
      return NextResponse.json({ error: "Invalid fix-context token." }, { status: 401, headers: noStoreHeaders() });
    }

    const fixAttempt = await prisma.fixAttempt.findUnique({
      where: { id },
      select: {
        id: true,
        testCaseId: true,
        status: true,
        fixContextJson: true,
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
      return NextResponse.json({ error: "Fix context not found." }, { status: 404, headers: noStoreHeaders() });
    }

    setSafeTags({
      fix_attempt_id: fixAttempt.id,
      test_case_id: fixAttempt.testCaseId,
      github_owner: fixAttempt.project.githubOwner,
      github_repo: fixAttempt.project.githubRepo
    });

    const nextStatus = getStatusAfterContextFetch(fixAttempt.status);
    if (nextStatus !== fixAttempt.status) {
      await prisma.fixAttempt.update({
        where: { id },
        data: { status: nextStatus }
      });
    }

    const responseBody = buildFixContextResponse({
      appUrl: process.env.FLOWPROOF_APP_URL || process.env.PERSONAPROBE_APP_URL,
      fixAttemptId: fixAttempt.id,
      fixContext: fixAttempt.fixContextJson as unknown as FixContext,
      requestUrl: request.url,
      token
    });

    return NextResponse.json(responseBody, { headers: noStoreHeaders() });
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0"
  };
}
