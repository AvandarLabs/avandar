import path from "node:path";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import * as dotenv from "dotenv";

/**
 * The env name an invocation loads when `--env` is not passed. It names
 * `.env.development`, which points at the local Supabase stack.
 */
export const DEFAULT_ENV_NAME = "development";

/** The global option that names the env file to load. */
const ENV_OPTION = "--env";

/**
 * The flags `--env` replaced, and the env name each one selected. They are
 * refused rather than ignored, so a run meant for production never quietly
 * runs against development instead.
 */
const ENV_NAME_FROM_REMOVED_FLAG = {
  "--staging": "staging",
  "--prod": "production",
} as const;

/**
 * An env name: lowercase letters, digits, and hyphens, starting with a
 * letter. The name becomes part of a file path, so this is also what keeps
 * `--env` from reaching outside the repo root.
 */
const ENV_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * The env this invocation loaded, for error messages.
 *
 * Module state because the choice belongs to the invocation rather than to any
 * one command: the entry point resolves it once, before any action runs, and
 * every `AvaEnv.requireVar` call afterwards needs to name the same file. It
 * starts at the default so a unit test that never loads an env file reports
 * `.env.development`, which is what the CLI does by default.
 */
let _loadedEnvName: string = DEFAULT_ENV_NAME;

/** The env file an env name selects, such as `.env.demo` for `demo`. */
function _buildEnvFileNameFromEnvName(envName: string): string {
  return `.env.${envName}`;
}

/** Throws when argv passes a flag that `--env` replaced. */
function _assertNoRemovedFlags(argv: readonly string[]): void {
  const removedFlagEntry = Object.entries(ENV_NAME_FROM_REMOVED_FLAG).find(
    ([flag]) => {
      return argv.includes(flag);
    },
  );
  if (removedFlagEntry !== undefined) {
    const [removedFlag, envName] = removedFlagEntry;
    throw new Error(
      `${removedFlag} was replaced by ${ENV_OPTION}. Pass ` +
        `${ENV_OPTION} ${envName} instead.`,
    );
  }
}

/** Throws when argv spells `--env` as `--env=<name>`. */
function _assertNoInlineEnvValue(argv: readonly string[]): void {
  const inlineToken = argv.find((token) => {
    return token.startsWith(`${ENV_OPTION}=`);
  });
  if (inlineToken !== undefined) {
    const envName = inlineToken.slice(ENV_OPTION.length + 1);
    throw new Error(
      `Pass ${ENV_OPTION} and its name as two words: ` +
        `${ENV_OPTION} ${envName}, not ${inlineToken}.`,
    );
  }
}

/** Throws unless `envName` is a valid env name. */
function _assertValidEnvName(
  envName: string | undefined,
): asserts envName is string {
  if (envName === undefined || envName.startsWith("-")) {
    throw new Error(
      `${ENV_OPTION} needs an environment name, such as ${ENV_OPTION} ` +
        "staging to load .env.staging.",
    );
  }
  if (!ENV_NAME_PATTERN.test(envName)) {
    throw new Error(
      `${ENV_OPTION} takes the part of an env file's name after ".env.", ` +
        "in lowercase letters, digits, and hyphens, such as staging for " +
        `.env.staging. Got "${envName}".`,
    );
  }
}

/**
 * The CLI's environment: which env file this invocation loads, chosen by the
 * global `--env <name>` option, and the variables read back out of it.
 *
 * Exactly one file is loaded per invocation, and nothing is merged. A run
 * with `--env staging` sees `.env.staging` and only `.env.staging`, so a
 * variable that file omits is genuinely absent rather than quietly inherited
 * from `.env.development`. Do not merge a fallback file in behind it: a
 * `--env production` run would then announce production and act on whatever
 * database `.env.development` names.
 *
 * The consequence is deliberate: a deployed env's file can be missing
 * variables a command needs, and nothing supplies them.
 * {@link AvaEnv.requireVar} is how that surfaces, naming both the variable
 * and the file to add it to.
 */
export const AvaEnv = {
  /**
   * Reads the env name off raw argv, before Acclimate parses anything.
   *
   * The env file has to be chosen before any command action runs, and
   * Acclimate hands parsed options to actions rather than to the entry point,
   * so argv is read directly here. `--env` is still declared as an Acclimate
   * global option on the root CLI, which is what makes it legal on every
   * command and documented in every help screen.
   *
   * @param argv Arguments after the executable and script, i.e.
   * `process.argv.slice(2)`.
   *
   * @returns The name after `--env`, or {@link DEFAULT_ENV_NAME} when
   * `--env` is not passed.
   *
   * @throws When `--env` is passed twice, without a valid name, or as
   * `--env=<name>`, and when a flag `--env` replaced is passed.
   */
  getEnvNameFromArgv(argv: readonly string[]): string {
    _assertNoRemovedFlags(argv);
    _assertNoInlineEnvValue(argv);

    const envOptionIndexes = argv.flatMap((token, index) => {
      return token === ENV_OPTION ? [index] : [];
    });
    if (envOptionIndexes.length > 1) {
      throw new Error(`Pass ${ENV_OPTION} at most once.`);
    }
    const [envOptionIndex] = envOptionIndexes;
    if (envOptionIndex === undefined) {
      return DEFAULT_ENV_NAME;
    }

    const envName = argv[envOptionIndex + 1];
    _assertValidEnvName(envName);
    return envName;
  },

  /**
   * Loads the env's file, and only that file.
   *
   * `override: true` makes the file authoritative over variables already in
   * the ambient shell. That is not the merging this module exists to prevent:
   * only one file is ever read, so there is no second file for its values to
   * win against.
   *
   * @param options.envName Which env's file to load, such as `staging` for
   * `.env.staging`.
   * @param options.envFilePath Overrides the resolved path. For tests.
   */
  load(options: Readonly<{ envName: string; envFilePath?: string }>): void {
    const { envName, envFilePath } = options;
    const fileName = _buildEnvFileNameFromEnvName(envName);
    const filePath =
      envFilePath ?? path.join(findRepoRoot() ?? process.cwd(), fileName);

    const result = dotenv.config({
      path: filePath,
      override: true,
      quiet: true,
    }) as Readonly<{ error?: unknown }>;

    if (result.error !== undefined) {
      throw new Error(
        `Failed to load ${fileName}. Run this command from inside the repo, ` +
          `and check that ${fileName} exists at its root.`,
      );
    }
    _loadedEnvName = envName;
  },

  /** The env this invocation loaded, such as `development` or `demo`. */
  getLoadedEnvName(): string {
    return _loadedEnvName;
  },

  /** The env file this invocation loaded. */
  getLoadedEnvFile(): string {
    return _buildEnvFileNameFromEnvName(AvaEnv.getLoadedEnvName());
  },

  /**
   * Whether this invocation loaded the default `.env.development`, which
   * points at the local Supabase stack. Every other env is treated as a
   * deployed one.
   */
  isLocal(): boolean {
    return AvaEnv.getLoadedEnvName() === DEFAULT_ENV_NAME;
  },

  /**
   * Reads a required environment variable, or throws naming where it belongs.
   *
   * The file in the message is the one this invocation actually loaded, so a
   * `--env production` run that is missing a variable says `.env.production`
   * rather than sending the reader to `.env.development` to add something
   * that would never be read.
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
