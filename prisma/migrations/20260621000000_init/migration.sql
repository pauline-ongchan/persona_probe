-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('PENDING', 'RUNNING', 'PASS', 'FAIL', 'ERROR');

-- CreateEnum
CREATE TYPE "OracleType" AS ENUM ('URL_CONTAINS', 'TEXT_CONTAINS', 'SELECTOR_EXISTS', 'LLM_JUDGE');

-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('REAL_WEBSITE', 'DEMO_SAFE');

-- CreateEnum
CREATE TYPE "FailureCategory" AS ENUM ('PERSONA_FAILURE', 'AGENT_FAILURE', 'UI_AMBIGUITY', 'BOT_BLOCKED', 'TIMEOUT', 'INFRA_FAILURE', 'ORACLE_FAILURE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "githubOwner" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL DEFAULT 'main',
    "autofixWorkflow" TEXT NOT NULL DEFAULT 'flowproof-autofix.yml',
    "sentryOrg" TEXT,
    "sentryProject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "mode" "RunMode" NOT NULL DEFAULT 'REAL_WEBSITE',
    "targetUrl" TEXT NOT NULL,
    "taskGoal" TEXT NOT NULL,
    "oracleType" "OracleType" NOT NULL,
    "oracleValue" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "behaviorPrompt" TEXT NOT NULL,
    "riskWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'PENDING',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "browserbaseSessionId" TEXT,
    "browserbaseSessionUrl" TEXT,
    "sentryTraceId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "agentSummary" TEXT,
    "failureReason" TEXT,
    "failureCategory" "FailureCategory",
    "finalUrl" TEXT,
    "finalTextSample" TEXT,
    "screenshotUrl" TEXT,
    "actionTrace" TEXT NOT NULL DEFAULT '[]',
    "rawLogs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixAttempt" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fixContextJson" JSONB NOT NULL,
    "fixContextToken" TEXT NOT NULL,
    "githubWorkflowRunId" TEXT,
    "prUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Run_projectId_idx" ON "Run"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_key_key" ON "Persona"("key");

-- CreateIndex
CREATE INDEX "TestCase_runId_idx" ON "TestCase"("runId");

-- CreateIndex
CREATE INDEX "TestCase_personaId_idx" ON "TestCase"("personaId");

-- CreateIndex
CREATE INDEX "TestCase_status_idx" ON "TestCase"("status");

-- CreateIndex
CREATE INDEX "FixAttempt_testCaseId_idx" ON "FixAttempt"("testCaseId");

-- CreateIndex
CREATE INDEX "FixAttempt_projectId_idx" ON "FixAttempt"("projectId");

-- CreateIndex
CREATE INDEX "FixAttempt_status_idx" ON "FixAttempt"("status");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixAttempt" ADD CONSTRAINT "FixAttempt_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixAttempt" ADD CONSTRAINT "FixAttempt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
