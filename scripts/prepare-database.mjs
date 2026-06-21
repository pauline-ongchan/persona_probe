import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL || "";
const directUrl = process.env.DIRECT_URL || "";

if (!databaseUrl) {
  console.log("DATABASE_URL is not set. Skipping Prisma migrate/seed.");
  process.exit(0);
}

if (databaseUrl.startsWith("file:")) {
  console.log("SQLite DATABASE_URL detected. Skipping production Prisma migrate/seed.");
  process.exit(0);
}

const migrateResult = run("npx", ["prisma", "migrate", "deploy"]);
if (migrateResult.status !== 0) {
  const output = `${migrateResult.stdout}\n${migrateResult.stderr}`;
  const fallbackDirectUrl = getSupabaseSessionPoolerUrl(databaseUrl);

  if (isDirectSupabaseReachabilityError(output) && directUrl && fallbackDirectUrl) {
    console.warn(
      "Prisma could not reach DIRECT_URL. Retrying migrations with the Supabase session pooler derived from DATABASE_URL."
    );

    const retryResult = run("npx", ["prisma", "migrate", "deploy"], {
      ...process.env,
      DIRECT_URL: fallbackDirectUrl
    });

    if (retryResult.status !== 0) {
      process.exit(retryResult.status ?? 1);
    }
  } else {
    process.exit(migrateResult.status ?? 1);
  }
}

const seedResult = run("npx", ["prisma", "db", "seed"]);
if (seedResult.status !== 0) {
  process.exit(seedResult.status ?? 1);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env,
    shell: process.platform === "win32"
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function isDirectSupabaseReachabilityError(output) {
  return output.includes("P1001") && output.includes("db.") && output.includes(".supabase.co:5432");
}

function getSupabaseSessionPoolerUrl(value) {
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith(".pooler.supabase.com")) return null;

    url.port = "5432";
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return null;
  }
}
