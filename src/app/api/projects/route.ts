import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  const targetUrl = String(body.targetUrl || "").trim();
  const githubOwner = String(body.githubOwner || "").trim();
  const githubRepo = String(body.githubRepo || "").trim();
  const baseBranch = String(body.baseBranch || "main").trim();
  const autofixWorkflow = String(body.autofixWorkflow || "flowproof-autofix.yml").trim();
  const sentryOrg = optionalString(body.sentryOrg);
  const sentryProject = optionalString(body.sentryProject);

  if (!name || !targetUrl || !githubOwner || !githubRepo || !baseBranch || !autofixWorkflow) {
    return NextResponse.json(
      { error: "Project name, target URL, GitHub owner, GitHub repo, base branch, and workflow file are required." },
      { status: 400 }
    );
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Target URL must use http or https." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Target URL must be an absolute URL." }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      targetUrl,
      githubOwner,
      githubRepo,
      baseBranch,
      autofixWorkflow,
      sentryOrg,
      sentryProject
    }
  });

  return NextResponse.json({ project }, { status: 201 });
}

function optionalString(value: unknown) {
  const stringValue = String(value || "").trim();
  return stringValue || null;
}
