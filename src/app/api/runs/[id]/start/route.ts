import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma/client";
import { runStagehandTest } from "@/lib/agent/runStagehandTest";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withSentrySpan("run.execute", { "run.id": id }, async () => {
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { status: "PENDING" },
          include: { persona: true },
          orderBy: { priorityScore: "desc" }
        }
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    await prisma.run.update({
      where: { id },
      data: { status: "RUNNING" }
    });

    for (const testCase of run.testCases) {
      const startedAt = new Date();
      await prisma.testCase.update({
        where: { id: testCase.id },
        data: { status: "RUNNING", startedAt }
      });

      try {
        const result = await runStagehandTest({
          mode: run.mode,
          targetUrl: run.targetUrl,
          taskGoal: run.taskGoal,
          persona: testCase.persona,
          oracle: {
            type: run.oracleType,
            value: run.oracleValue
          },
          runId: run.id,
          testCaseId: testCase.id
        });

        await prisma.testCase.update({
          where: { id: testCase.id },
          data: {
            status: result.status,
            browserbaseSessionId: result.browserbaseSessionId,
            browserbaseSessionUrl: result.browserbaseSessionUrl,
            sentryTraceId: result.sentryTraceId,
            completedAt: new Date(),
            durationMs: result.durationMs,
            agentSummary: result.agentSummary,
            failureReason: result.failureReason,
            failureCategory: result.failureCategory,
            finalUrl: result.finalUrl,
            finalTextSample: result.finalTextSample,
            screenshotUrl: result.screenshotUrl,
            actionTrace: JSON.stringify(result.actionTrace).slice(0, 120000),
            rawLogs: JSON.stringify(result.rawLogs).slice(0, 16000)
          }
        });
      } catch (error) {
        Sentry.captureException(error);
        await prisma.testCase.update({
          where: { id: testCase.id },
          data: {
            status: "ERROR",
            completedAt: new Date(),
            durationMs: Date.now() - startedAt.getTime(),
            failureReason: error instanceof Error ? error.message : "Unknown run execution error.",
            failureCategory: "UNKNOWN"
          }
        });
      }
    }

    const remainingPending = await prisma.testCase.count({
      where: { runId: id, status: { in: ["PENDING", "RUNNING"] } }
    });
    const errored = await prisma.testCase.count({
      where: { runId: id, status: "ERROR" }
    });

    const updatedRun = await prisma.run.update({
      where: { id },
      data: {
        status: remainingPending > 0 ? "RUNNING" : errored === run.testCases.length ? "FAILED" : "COMPLETE"
      },
      include: {
        testCases: {
          include: { persona: true },
          orderBy: { priorityScore: "desc" }
        }
      }
    });

    return NextResponse.json({ run: updatedRun });
  });
}
