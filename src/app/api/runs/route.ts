import { NextResponse } from "next/server";
import type { OracleType, RunMode } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { scoreTestCase } from "@/lib/ranking/scoreTestCase";
import { getDemoAccountSettingsTargetUrl, isLocalhostTarget } from "@/lib/runs/demoTarget";
import { withSentrySpan } from "@/lib/sentry/withSentrySpan";

const oracleTypes = new Set(["URL_CONTAINS", "TEXT_CONTAINS", "SELECTOR_EXISTS", "LLM_JUDGE"]);
const runModes = new Set(["REAL_WEBSITE", "DEMO_SAFE"]);
const DEMO_TASK = "Change the account email to test@example.com and reach the confirmation screen.";
const DEMO_ORACLE_TYPE = "TEXT_CONTAINS" satisfies OracleType;
const DEMO_ORACLE_VALUE = "Email updated successfully";

export async function POST(request: Request) {
  return withSentrySpan("run.create", {}, async () => {
    const body = await request.json();
    const mode = (runModes.has(String(body.mode)) ? String(body.mode) : "REAL_WEBSITE") as RunMode;
    const isDemoMode = mode === "DEMO_SAFE";
    const requestedTargetUrl = String(body.targetUrl || "").trim();
    const targetUrl = isDemoMode ? getDemoAccountSettingsTargetUrl(request.url) : requestedTargetUrl;
    const taskGoal = isDemoMode ? DEMO_TASK : String(body.taskGoal || "").trim();
    const oracleType = (isDemoMode ? DEMO_ORACLE_TYPE : String(body.oracleType || "TEXT_CONTAINS")) as OracleType;
    const oracleValue = isDemoMode ? DEMO_ORACLE_VALUE : String(body.oracleValue || "").trim();
    const projectId = typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;
    const personaKeys = Array.isArray(body.personaKeys) ? body.personaKeys.map(String) : [];
    const maxRuns = Math.max(1, Math.min(Number(body.maxRuns || personaKeys.length || 1), 12));

    if (!targetUrl || !taskGoal || !oracleValue || !oracleTypes.has(oracleType)) {
      return NextResponse.json({ error: "Target URL, task goal, and valid success criteria are required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Target URL must be an absolute URL." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Target URL must use http or https." }, { status: 400 });
    }

    if (isLocalhostTarget(parsedUrl) && process.env.ALLOW_LOCALHOST_TARGETS !== "true") {
      return NextResponse.json(
        {
          error:
            isDemoMode
              ? "The sample flow must be reachable by Browserbase. Deploy to Vercel, set NEXT_PUBLIC_DEMO_BASE_URL to that URL, or enable ALLOW_LOCALHOST_TARGETS for local-only testing."
              : "Browserbase runs in the cloud and cannot open your machine's localhost. Use a deployed site or public tunnel URL."
        },
        { status: 400 }
      );
    }

    const personas = await prisma.persona.findMany({
      where: personaKeys.length ? { key: { in: personaKeys } } : undefined,
      orderBy: { riskWeight: "desc" },
      take: maxRuns
    });

    if (!personas.length) {
      return NextResponse.json({ error: "Select at least one persona." }, { status: 400 });
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true }
      });

      if (!project) {
        return NextResponse.json({ error: "Selected project was not found." }, { status: 404 });
      }
    }

    const run = await prisma.run.create({
      data: {
        projectId,
        name: isDemoMode ? "Sample account settings QA run" : `${new URL(targetUrl).hostname} QA run`,
        mode,
        targetUrl,
        taskGoal,
        oracleType,
        oracleValue,
        testCases: {
          create: personas.map((persona) => ({
            personaId: persona.id,
            priorityScore: scoreTestCase({ persona, taskGoal, oracleType })
          }))
        }
      },
      include: {
        testCases: {
          include: {
            persona: true
          },
          orderBy: { priorityScore: "desc" }
        }
      }
    });

    return NextResponse.json({ run }, { status: 201 });
  });
}
