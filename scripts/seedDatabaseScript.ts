/**
 * CLI script to seed data as configured in `seed/SeedConfig.ts`.
 *
 * Usage: pnpm vite-script scripts/lib/seedDatabaseScript.ts
 *
 * This script should rarely be called on its own, which is why there
 * is no package.json script to call it. It should typically run as
 * part of `resetDatabaseScript.sh` through the `pnpm db:reset` command.
 */
import { SeedRunner } from "scripts/SeedRunner";
import { SeedData } from "seed/SeedData";
import { SeedJobs } from "seed/SeedJobs";

async function main(): Promise<void> {
  // `ava supabase switch remote` points SUPABASE_URL at a hosted project, and
  // seed data belongs only in a local database.
  const remoteProjectId = process.env.AVA_SUPABASE_REMOTE_PROJECT_ID;
  if (remoteProjectId) {
    console.error(
      `❌ This worktree is switched to the hosted Supabase project ${remoteProjectId}, so it will not be seeded.\n  ⚠️ Run \`ava supabase restore\` to go back to a local Supabase, then retry.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log("Initializing the database seed runner");

  const runner = new SeedRunner({
    data: SeedData,
    jobs: SeedJobs,
  });

  console.log("Seeding database...");
  await runner.run();
  console.log("Database seeded successfully");
}

main();
