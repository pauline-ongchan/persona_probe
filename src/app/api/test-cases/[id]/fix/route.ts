import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { collectFixContext } from "@/lib/fix/collectFixContext";
import { createFixContextToken } from "@/lib/fix/fixContextToken";
import { normalizePublicAppUrl } from "@/lib/fix/publicAppUrl";
import { redactFixContext } from "@/lib/fix/redactFixContext";
import { triggerAutofixWorkflow } from "@/lib/fix/triggerAutofixWorkflow";
import { setSafeTags, withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withSentrySpan("fix.create_request", { test_case_id: id }, async () => {
    const body = await safeJson(request);
    const requestedProjectId = typeof body.projectId === "string" ? body.projectId : undefined;

    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        run: {
          include: {
            project: true
          }
        }
      }
    });

    if (!testCase) {
      return NextResponse.json({ error: "Test case not found." }, { status: 404 });
    }

    if (!["FAIL", "ERROR"].includes(testCase.status) || !testCase.failureReason) {
      return NextResponse.json(
        { error: "Create Fix PR is available only for failed test cases with a captured failure reason." },
        { status: 400 }
      );
    }

    const projectId = requestedProjectId || testCase.run.projectId;
    if (!projectId) {
      return NextResponse.json(
        { error: "Configure a Project for this target repo, then associate it with the run before creating a fix PR." },
        { status: 400 }
      );
    }

    const project = requestedProjectId
      ? await prisma.project.findUnique({ where: { id: requestedProjectId } })
      : testCase.run.project;

    if (!project) {
      return NextResponse.json({ error: "Project configuration not found." }, { status: 404 });
    }

    setSafeTags({
      test_case_id: id,
      github_owner: project.githubOwner,
      github_repo: project.githubRepo
    });

    const appUrl = (process.env.FLOWPROOF_APP_URL || process.env.PERSONAPROBE_APP_URL)?.replace(/\/$/, "");
    if (!appUrl) {
      return NextResponse.json({ error: "FLOWPROOF_APP_URL is required to create signed fix-context URLs." }, { status: 500 });
    }

    const cleanContext = redactFixContext(await collectFixContext({ testCaseId: id, projectId: project.id }));

    const fixAttempt = await withSentrySpan(
      "fix.create_attempt",
      {
        test_case_id: id,
        github_owner: project.githubOwner,
        github_repo: project.githubRepo
      },
      () =>
        prisma.fixAttempt.create({
          data: {
            testCaseId: id,
            projectId: project.id,
            status: "PENDING",
            fixContextJson: cleanContext as unknown as Prisma.InputJsonValue,
            fixContextToken: ""
          }
        })
    );

    setSafeTags({ fix_attempt_id: fixAttempt.id });

    try {
      const fixContextToken = createFixContextToken(fixAttempt.id);
      const fixContextUrl = `${appUrl}/api/fix-context/${fixAttempt.id}?token=${encodeURIComponent(fixContextToken)}`;

      await prisma.fixAttempt.update({
        where: { id: fixAttempt.id },
        data: { fixContextToken }
      });

      await triggerAutofixWorkflow({
        owner: project.githubOwner,
        repo: project.githubRepo,
        workflowFile: project.autofixWorkflow,
        ref: project.baseBranch,
        fixContextUrl,
        fixAttemptId: fixAttempt.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown GitHub workflow trigger error.";
      const failedAttempt = await prisma.fixAttempt.update({
        where: { id: fixAttempt.id },
        data: {
          status: "FAILED",
          errorMessage
        }
      });

      return NextResponse.json(
        {
          error: errorMessage,
          fixAttempt: toFixAttemptSummary(failedAttempt)
        },
        { status: 502 }
      );
    }

    const updatedAttempt = await prisma.fixAttempt.update({
      where: { id: fixAttempt.id },
      data: { status: "WORKFLOW_TRIGGERED" }
    });

    return NextResponse.json({
      fixAttempt: toFixAttemptSummary(updatedAttempt)
    });
  });
}

function toFixAttemptSummary(fixAttempt: {
  id: string;
  status: string;
  prUrl: string | null;
  errorMessage: string | null;
}) {
  return {
    id: fixAttempt.id,
    status: fixAttempt.status,
    prUrl: fixAttempt.prUrl,
    errorMessage: fixAttempt.errorMessage
  };
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
