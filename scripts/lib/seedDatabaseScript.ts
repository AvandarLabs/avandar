/**
 * CLI script to seed data as configured in `seed/SeedConfig.ts`.
 *
 * Usage: yarn vite-script scripts/lib/seedDatabaseScript.ts
 *
 * This script should rarely be called on its own, which is why there
 * is no package.json script to call it. It should typically run as
 * part of `resetDatabaseScript.sh` through the `yarn db:reset` command.
 */
import { SEED_DATA, SEED_JOBS } from "../../seed/SeedConfig";
import { SeedRunner } from "./SeedRunner";

async function main(): Promise<void> {
  console.log("Initializing the database seed runner");

  const runner = new SeedRunner({
    data: SEED_DATA,
    jobs: SEED_JOBS,
  });

  console.log("Seeding database...");
  await runner.run();
  console.log("Database seeded successfully");
}

main();
