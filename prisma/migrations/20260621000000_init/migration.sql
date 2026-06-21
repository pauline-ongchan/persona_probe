-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "taskGoal" TEXT NOT NULL,
    "oracleType" TEXT NOT NULL,
    "oracleValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "behaviorPrompt" TEXT NOT NULL,
    "riskWeight" REAL NOT NULL DEFAULT 0.5
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priorityScore" REAL NOT NULL DEFAULT 0,
    "browserbaseSessionId" TEXT,
    "browserbaseSessionUrl" TEXT,
    "sentryTraceId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "agentSummary" TEXT,
    "failureReason" TEXT,
    "finalUrl" TEXT,
    "finalTextSample" TEXT,
    "screenshotUrl" TEXT,
    "rawLogs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestCase_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestCase_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_key_key" ON "Persona"("key");

-- CreateIndex
CREATE INDEX "TestCase_runId_idx" ON "TestCase"("runId");

-- CreateIndex
CREATE INDEX "TestCase_personaId_idx" ON "TestCase"("personaId");

-- CreateIndex
CREATE INDEX "TestCase_status_idx" ON "TestCase"("status");
