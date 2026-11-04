import { EnvFileLine } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";
import {
  MAX_TCP_PORT,
  MIN_TCP_PORT,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { isDefined, objectEntries } from "@avandar/utils";
import type { SupabaseConfigState } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** One `KEY=value` line the managed block writes, as a key and its value. */
export type SupabaseConfigOverride = readonly [key: string, value: string];

/** Environment variable that overrides `project_id` in `config.toml`. */
const PROJECT_ID_ENV_KEY = "SUPABASE_PROJECT_ID";

/**
 * Environment variable a remote switch writes to name the hosted project the
 * worktree points at. The Supabase CLI ignores it: it only labels the switch.
 */
const REMOTE_PROJECT_ID_ENV_KEY = "AVA_SUPABASE_REMOTE_PROJECT_ID";

const BLOCK_START = "# >>> ava supabase switch >>>";
const BLOCK_END = "# <<< ava supabase switch <<<";
const BLOCK_NOTE =
  "# Managed by `ava supabase switch`. Run `ava supabase restore` to remove it.";

/**
 * Config sections whose environment variables use another section's name.
 *
 * The CLI reads `[inbucket]` as a deprecated alias of `[local_smtp]`, so its
 * port only moves through `SUPABASE_LOCAL_SMTP_PORT`. `SUPABASE_INBUCKET_PORT`
 * is accepted without error and silently ignored.
 */
const ENV_SECTION_FROM_CONFIG_SECTION: Readonly<Record<string, string>> = {
  inbucket: "local_smtp",
};

const OVERRIDE_PORT_KEY_PATTERN = /^SUPABASE_[A-Z0-9_]+_PORT$/;

function _getEnvKeyFromConfigKey(configKey: string): string {
  const [section = "", ...keyParts] = configKey.split(".");
  const envSection = ENV_SECTION_FROM_CONFIG_SECTION[section] ?? section;
  return `SUPABASE_${[envSection, ...keyParts].join("_").toUpperCase()}`;
}

function _isOverrideKey(envKey: string): boolean {
  return (
    envKey === PROJECT_ID_ENV_KEY ||
    envKey === REMOTE_PROJECT_ID_ENV_KEY ||
    OVERRIDE_PORT_KEY_PATTERN.test(envKey)
  );
}

/** Reads every `KEY=value` assignment, unquoted, the last one winning. */
function _getEnvValuesFromContents(envContents: string): Map<string, string> {
  return new Map(
    envContents
      .split("\n")
      .map(EnvFileLine.getAssignment)
      .filter(isDefined)
      .map(({ key, value }) => {
        return [key.trim(), EnvFileLine.getUnquotedValue(value)] as const;
      }),
  );
}

function _makeEffectiveState(
  options: Readonly<{ config: SupabaseConfigState; envContents: string }>,
): SupabaseConfigState {
  const { config } = options;
  const envValues = _getEnvValuesFromContents(options.envContents);
  const ports = Object.fromEntries(
    objectEntries(config.ports).map(([configKey, port]) => {
      const overrideText = envValues.get(_getEnvKeyFromConfigKey(configKey));
      const override = Number(overrideText);
      const isValidPort =
        overrideText !== undefined &&
        /^\d+$/.test(overrideText) &&
        override >= MIN_TCP_PORT &&
        override <= MAX_TCP_PORT;
      return [configKey, isValidPort ? override : port];
    }),
  );
  return {
    projectId: envValues.get(PROJECT_ID_ENV_KEY) || config.projectId,
    apiPort: ports["api.port"] ?? config.apiPort,
    ports,
  };
}

function _removeOverrideLines(envContents: string): string[] {
  const lines = envContents.split("\n");
  const blockStart = lines.indexOf(BLOCK_START);
  const blockEnd = lines.indexOf(BLOCK_END, blockStart);
  const linesWithoutBlock =
    blockStart === -1 || blockEnd === -1
      ? lines
      : [...lines.slice(0, blockStart), ...lines.slice(blockEnd + 1)];
  return linesWithoutBlock.filter((line) => {
    const assignment = EnvFileLine.getAssignment(line);
    return assignment === undefined || !_isOverrideKey(assignment.key.trim());
  });
}

function _makeEnvContentsWithOverrides(
  options: Readonly<{
    envContents: string;
    overrides: readonly SupabaseConfigOverride[];
  }>,
): string {
  const keptContents = _removeOverrideLines(options.envContents)
    .join("\n")
    .replace(/\n+$/, "");
  const block = [
    BLOCK_START,
    BLOCK_NOTE,
    ...options.overrides.map(([key, value]) => {
      return `${key}=${value}`;
    }),
    BLOCK_END,
  ].join("\n");
  return keptContents === "" ? `${block}\n` : `${keptContents}\n\n${block}\n`;
}

function _makeLocalOverrides(
  options: Readonly<{ projectId: string; ports: Record<string, number> }>,
): SupabaseConfigOverride[] {
  return [
    [PROJECT_ID_ENV_KEY, options.projectId],
    ...objectEntries(options.ports).map(([configKey, port]) => {
      return [_getEnvKeyFromConfigKey(configKey), String(port)] as const;
    }),
  ];
}

/**
 * Reads and writes the `.env.development` lines that point the Supabase CLI at
 * a branch's own project, so `supabase/config.toml` never changes.
 *
 * The CLI loads `.env.development` from the project root and lets
 * `SUPABASE_PROJECT_ID` and `SUPABASE_<SECTION>_<KEY>` variables override the
 * TOML. `ava supabase switch` writes those variables into one managed block,
 * and `ava supabase status`, `start`, `stop`, and `prune` read them back to
 * learn which project a worktree is really on.
 */
export const SupabaseConfigOverrides = {
  /** The environment variable the Supabase CLI reads for a config key. */
  getEnvKeyFromConfigKey: _getEnvKeyFromConfigKey,

  /**
   * Whether a variable redirects the Supabase CLI or labels a switch.
   *
   * A child `supabase` process must not inherit these from `ava`'s own
   * environment, or the worktree it runs in loses control of its project.
   */
  isOverrideKey: _isOverrideKey,

  /** The project id and ports the Supabase CLI will actually use. */
  makeEffectiveState: _makeEffectiveState,

  /**
   * Writes the managed block, replacing any earlier one.
   *
   * Override variables assigned outside the block are dropped, since the CLI
   * would otherwise see two values for one key.
   */
  makeEnvContentsWithOverrides: _makeEnvContentsWithOverrides,

  /** The block entries that move a worktree onto a local project. */
  makeLocalOverrides: _makeLocalOverrides,

  /** The block entries that mark a worktree as pointed at a hosted project. */
  makeRemoteOverrides: (remoteProjectId: string): SupabaseConfigOverride[] => {
    return [[REMOTE_PROJECT_ID_ENV_KEY, remoteProjectId]];
  },

  /** The hosted project a remote switch recorded, if there is one. */
  getRemoteProjectIdFromEnvContents: (
    envContents: string,
  ): string | undefined => {
    return (
      _getEnvValuesFromContents(envContents).get(REMOTE_PROJECT_ID_ENV_KEY) ||
      undefined
    );
  },
};
