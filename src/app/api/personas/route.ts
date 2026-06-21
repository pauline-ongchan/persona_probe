import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const personas = await prisma.persona.findMany({
    orderBy: [{ riskWeight: "desc" }, { name: "asc" }]
  });

  return NextResponse.json({ personas });
}
