import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { scoreTestCase } from "@/lib/ranking/scoreTestCase";
import { getSelfHealedDemoAccountSettingsTargetUrl } from "@/lib/runs/demoTarget";
import { encodeSelfHealPlan, generateSelfHealPlan } from "@/lib/self-healing/generateSelfHealPlan";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return withSentrySpan("run.self_heal", { "run.id": id }, async () => {
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        testCases: {
          include: { persona: true },
          orderBy: { priorityScore: "desc" }
        }
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    if (run.mode !== "DEMO_SAFE") {
      return NextResponse.json({ error: "Self-healing is currently available for sample-flow runs." }, { status: 400 });
    }

    const failedTestCases = run.testCases.filter(
      (testCase) =>
        (testCase.status === "FAIL" || testCase.status === "ERROR") && testCase.failureCategory !== "INFRA_FAILURE"
    );

    if (!failedTestCases.length) {
      return NextResponse.json({ error: "No persona/UI failures are available to self-heal." }, { status: 400 });
    }

    const personasToRerun = run.testCases.map((testCase) => testCase.persona);
    const selfHealPlan = await generateSelfHealPlan({
      runId: run.id,
      mode: run.mode,
      oracleType: run.oracleType,
      testCases: run.testCases
    });
    const targetUrl = getSelfHealedDemoAccountSettingsTargetUrl(request.url, encodeSelfHealPlan(selfHealPlan));
    const newRun = await prisma.run.create({
      data: {
        name: `Self-healed: ${run.name}`,
        mode: run.mode,
        targetUrl,
        taskGoal: run.taskGoal,
        oracleType: run.oracleType,
        oracleValue: run.oracleValue,
        testCases: {
          create: personasToRerun.map((persona) => ({
            personaId: persona.id,
            priorityScore: scoreTestCase({
              persona,
              taskGoal: run.taskGoal,
              oracleType: run.oracleType,
              previousFailureBoost: failedTestCases.some((testCase) => testCase.personaId === persona.id) ? 1 : 0
            })
          }))
        }
      },
      include: {
        testCases: {
          include: { persona: true },
          orderBy: { priorityScore: "desc" }
        }
      }
    });

    return NextResponse.json(
      {
        run: newRun,
        fix: {
          sourceRunId: run.id,
          targetUrl,
          plan: selfHealPlan,
          summary: `Self-healing agent generated ${selfHealPlan.reasons.length} repair reason${
            selfHealPlan.reasons.length === 1 ? "" : "s"
          } from this run's failed action traces.`
        }
      },
      { status: 201 }
    );
  });
}
