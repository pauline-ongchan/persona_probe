-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "githubOwner" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL DEFAULT 'main',
    "autofixWorkflow" TEXT NOT NULL DEFAULT 'personaprobe-autofix.yml',
    "sentryOrg" TEXT,
    "sentryProject" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'REAL_WEBSITE',
    "targetUrl" TEXT NOT NULL,
    "taskGoal" TEXT NOT NULL,
    "oracleType" TEXT NOT NULL,
    "oracleValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("createdAt", "id", "mode", "name", "oracleType", "oracleValue", "status", "targetUrl", "taskGoal", "updatedAt")
SELECT "createdAt", "id", "mode", "name", "oracleType", "oracleValue", "status", "targetUrl", "taskGoal", "updatedAt" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "FixAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testCaseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fixContextJson" JSONB NOT NULL,
    "fixContextToken" TEXT NOT NULL,
    "githubWorkflowRunId" TEXT,
    "prUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FixAttempt_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FixAttempt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Run_projectId_idx" ON "Run"("projectId");

-- CreateIndex
CREATE INDEX "FixAttempt_testCaseId_idx" ON "FixAttempt"("testCaseId");

-- CreateIndex
CREATE INDEX "FixAttempt_projectId_idx" ON "FixAttempt"("projectId");

-- CreateIndex
CREATE INDEX "FixAttempt_status_idx" ON "FixAttempt"("status");
