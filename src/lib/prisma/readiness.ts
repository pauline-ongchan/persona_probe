export type DatabaseSetupIssue = {
  title: string;
  message: string;
};

export function getDatabaseSetupIssue(error: unknown): DatabaseSetupIssue | null {
  const message = error instanceof Error ? error.message : String(error || "");

  if (
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Environment variable not found: DIRECT_URL") ||
    message.includes("Error validating datasource") ||
    message.includes("the URL must start with the protocol") ||
    message.includes("DATABASE_URL") ||
    message.includes("DIRECT_URL")
  ) {
    return {
      title: "Database URL is not configured",
      message: "Set DATABASE_URL and DIRECT_URL in Vercel to hosted Postgres connection strings so PersonaProbe can store projects, runs, test cases, and fix attempts."
    };
  }

  if (
    message.includes("does not exist in the current database") ||
    message.includes("The table") ||
    message.includes("no such table") ||
    message.includes("P2021")
  ) {
    return {
      title: "Database schema is not ready",
      message: "Run the Prisma migration or push the schema to your deployed database, then seed the default personas."
    };
  }

  if (message.includes("Can't reach database server") || message.includes("P1001")) {
    return {
      title: "Database is unreachable",
      message: "Check that DATABASE_URL points to a reachable hosted database from Vercel."
    };
  }

  return null;
}
