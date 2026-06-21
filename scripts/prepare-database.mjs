import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL || "";

if (!databaseUrl) {
  console.log("DATABASE_URL is not set. Skipping Prisma migrate/seed.");
  process.exit(0);
}

if (databaseUrl.startsWith("file:")) {
  console.log("SQLite DATABASE_URL detected. Skipping production Prisma migrate/seed.");
  process.exit(0);
}

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["prisma", "db", "seed"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
