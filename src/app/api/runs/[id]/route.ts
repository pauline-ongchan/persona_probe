import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { getRunAggregates } from "@/lib/runs/aggregates";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const run = await prisma.run.findUnique({
    where: { id },
    include: {
      testCases: {
        include: { persona: true },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    run,
    aggregates: getRunAggregates(run.testCases)
  });
}
