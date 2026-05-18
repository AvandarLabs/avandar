import { join } from "node:path";

export type ResolveMigrationsDirArgs = {
  readonly mode: "development" | "production";
  /** Absolute path to `apps/desktop/main/` at runtime. */
  readonly mainDir: string;
  /** Electrobun's `PATHS.RESOURCES_FOLDER` in production. */
  readonly resourcesFolder: string;
  /** Explicit override (e.g. `AVA_MIGRATIONS_DIR`). Empty string = unset. */
  readonly override: string | undefined;
};

/**
 * Picks the directory the SQLite migration runner reads from at startup.
 *
 * In development the source tree is the runtime — Bun executes
 * `main/index.ts` in place, so `<mainDir>/../migrations` is the
 * committed `apps/desktop/migrations/` folder. In production the
 * bundled Electrobun app copies that folder to
 * `<RESOURCES_FOLDER>/app/migrations/` (see `electrobun.config.ts`).
 *
 * An override (typically `process.env.AVA_MIGRATIONS_DIR`) wins in both
 * modes — used by end-to-end tests that point the desktop at a fixture
 * directory.
 *
 * Pure: performs no I/O and does not check that the chosen path exists.
 *
 * @returns Absolute path to the directory to feed `loadMigrationsFromDir`.
 */
export function resolveMigrationsDir(
  args: ResolveMigrationsDirArgs,
): string {
  if (args.override !== undefined && args.override !== "") {
    return args.override;
  }
  if (args.mode === "development") {
    return join(args.mainDir, "..", "migrations");
  }
  return join(args.resourcesFolder, "app", "migrations");
}
