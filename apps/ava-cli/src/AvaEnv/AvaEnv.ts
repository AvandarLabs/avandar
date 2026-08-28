import path from "node:path";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import * as dotenv from "dotenv";

/** Which deployment the CLI is pointed at for this invocation. */
export type AvaEnvTarget = "local" | "staging" | "production";

/**
 * The one env file each target reads.
 *
 * Exactly one of these is loaded per invocation, and nothing is merged. A run
 * pointed at staging sees `.env.staging` and only `.env.staging`, so a variable
 * that file omits is genuinely absent rather than quietly inherited from
 * `.env.development`. That inheritance is what used to make `--prod` announce
 * production and then act on the local database.
 *
 * The consequence is deliberate: `.env.staging` and `.env.production` were
 * written while the merge existed, so they are missing variables that a
 * `--staging` or `--prod` run now needs. {@link AvaEnv.requireVar} is how that
 * surfaces, naming both the variable and the file to add it to.
 */
export const ENV_FILE_FROM_TARGET = {
  local: ".env.development",
  staging: ".env.staging",
  production: ".env.production",
} as const satisfies Record<AvaEnvTarget, string>;

/** The global flags that select a non-local target. */
const TARGET_FROM_FLAG = {
  "--staging": "staging",
  "--prod": "production",
} as const satisfies Record<string, AvaEnvTarget>;

/**
 * The target whose file was loaded, for error messages.
 *
 * Module state because the choice belongs to the invocation rather than to any
 * one command: the entry point resolves it once, before any action runs, and
 * every `AvaEnv.requireVar` call afterwards needs to name the same file. It
 * starts at `local` so a unit test that never loads an env file reports
 * `.env.development`, which is what the CLI does by default.
 */
let _loadedTarget: AvaEnvTarget = "local";

/**
 * The CLI's environment: which deployment this invocation points at, the one
 * env file that choice loads, and the variables read back out of it.
 */
export const AvaEnv = {
  /**
   * Reads the target off raw argv, before Acclimate parses anything.
   *
   * The env file has to be chosen before any command action runs, and
   * Acclimate hands parsed options to actions rather than to the entry point,
   * so argv is read directly here. `--staging` and `--prod` are still declared
   * as Acclimate global options on the root CLI, which is what makes them
   * legal on every command and documented in every help screen.
   *
   * @param argv Arguments after the executable and script, i.e.
   * `process.argv.slice(2)`.
   */
  getEnvTargetFromArgv(argv: readonly string[]): AvaEnvTarget {
    const passed = new Set(argv);
    const flags = Object.keys(TARGET_FROM_FLAG).filter((flag) => {
      return passed.has(flag);
    }) as ReadonlyArray<keyof typeof TARGET_FROM_FLAG>;

    if (flags.length > 1) {
      throw new Error("Pass at most one of --staging and --prod.");
    }
    const flag = flags[0];
    return flag ? TARGET_FROM_FLAG[flag] : "local";
  },

  /**
   * Loads the target's env file, and only that file.
   *
   * `override: true` makes the file authoritative over variables already in
   * the ambient shell. That is not the merging this module exists to prevent:
   * only one file is ever read, so there is no second file for its values to
   * win against.
   *
   * @param options.target Which deployment's file to load.
   * @param options.envFilePath Overrides the resolved path. For tests.
   */
  load(
    options: Readonly<{ target: AvaEnvTarget; envFilePath?: string }>,
  ): void {
    const { target, envFilePath } = options;
    const fileName = ENV_FILE_FROM_TARGET[target];
    const filePath =
      envFilePath ?? path.join(findRepoRoot() ?? process.cwd(), fileName);

    const result = dotenv.config({
      path: filePath,
      override: true,
      quiet: true,
    }) as Readonly<{ error?: unknown }>;

    if (result.error !== undefined) {
      throw new Error(
        `Failed to load ${fileName}. Run this command from the repo root so ` +
          "we can load the environment variables.",
      );
    }
    _loadedTarget = target;
  },

  /** The target this invocation is pointed at. */
  getLoadedEnvTarget(): AvaEnvTarget {
    return _loadedTarget;
  },

  /** The env file this invocation loaded. */
  getLoadedEnvFile(): string {
    return ENV_FILE_FROM_TARGET[_loadedTarget];
  },

  /**
   * Reads a required environment variable, or throws naming where it belongs.
   *
   * The file in the message is the one this invocation actually loaded, so a
   * `--prod` run that is missing a variable says `.env.production` rather than
   * sending the reader to `.env.development` to add something that would never
   * be read.
   *
   * Treats whitespace as absent: a key present but empty is not a value, and
   * failing here beats failing later with a blank in a URL or a header.
   */
  requireVar(name: string): string {
    const value = (process.env[name] ?? "").trim();
    if (!value) {
      throw new Error(`${name} is not set in ${AvaEnv.getLoadedEnvFile()}`);
    }
    return value;
  },
};
