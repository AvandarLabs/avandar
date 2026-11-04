import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { SupabaseRemoteConnection } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const COMMAND_NAME = "ava supabase switch remote";

/**
 * Acclimate prompts for an empty option only when someone can answer. Without
 * a terminal a missing value is reported with the full invocation instead, so
 * a script never hangs on a prompt.
 */
const IS_INTERACTIVE = process.stdin.isTTY === true;

type RemoteOptions = {
  projectId?: string;
  apiUrl?: string;
  databaseUrl?: string;
  publishableKey?: string;
  secretKey?: string;
};

const REQUIRED_OPTION_FROM_KEY = {
  projectId: "--project-id",
  databaseUrl: "--database-url",
  publishableKey: "--publishable-key",
  secretKey: "--secret-key",
} as const satisfies Partial<Record<keyof RemoteOptions, string>>;

/** What `ava supabase switch remote --help` prints. */
export const SupabaseSwitchRemoteHelp: CommandHelpSpec = {
  commandPath: ["supabase", "switch", "remote"],
  summary:
    "Point this worktree's development env files at a hosted Supabase project, so `pnpm dev` uses that database. `ava supabase restore` puts them back.",
  usage: [
    "ava supabase switch remote [--project-id <ref>] [--api-url <url>] [--database-url <url>] [--publishable-key <key>] [--secret-key <key>]",
  ],
  options: [
    {
      label: "--project-id <ref>",
      description: "The hosted project's reference id. Required.",
    },
    {
      label: "--api-url <url>",
      description:
        "The project URL. Defaults to https://<project-id>.supabase.co.",
    },
    {
      label: "--database-url <url>",
      description:
        "A postgresql:// connection string for the hosted database. Required.",
    },
    {
      label: "--publishable-key <key>",
      description: "The project's publishable (anon) key. Required.",
    },
    {
      label: "--secret-key <key>",
      description: "The project's secret (service role) key. Required.",
    },
  ],
  examples: [
    {
      label: "ava supabase switch remote",
      description: "Ask for every value in the terminal.",
    },
    {
      label:
        "ava supabase switch remote --project-id abcdefghijklmnopqrst --database-url postgresql://… --publishable-key sb_publishable_… --secret-key sb_secret_…",
      description: "Switch without prompts, for example from a script.",
    },
  ],
};

function _makeConnection(
  options: Readonly<RemoteOptions>,
): SupabaseRemoteConnection | undefined {
  const { projectId, databaseUrl, publishableKey, secretKey } = options;
  if (
    projectId === undefined ||
    databaseUrl === undefined ||
    publishableKey === undefined ||
    secretKey === undefined
  ) {
    return undefined;
  }
  return {
    projectId: projectId.trim(),
    apiUrl: options.apiUrl?.trim() || `https://${projectId.trim()}.supabase.co`,
    databaseUrl: databaseUrl.trim(),
    publishableKey: publishableKey.trim(),
    secretKey: secretKey.trim(),
  };
}

function _reportMissingOptions(options: Readonly<RemoteOptions>): void {
  const missingFlags = Object.entries(REQUIRED_OPTION_FROM_KEY).flatMap(
    ([key, flag]) => {
      return options[key as keyof RemoteOptions] === undefined ? [flag] : [];
    },
  );
  CliTheme.error({
    command: COMMAND_NAME,
    message: IS_INTERACTIVE
      ? `${missingFlags.join(", ")} was left empty.`
      : `Missing ${missingFlags.join(", ")}, and there is no terminal to ask on.`,
    hint: `Run it as: ${SupabaseSwitchRemoteHelp.usage[0]}`,
  });
}

async function _run(options: Readonly<RemoteOptions>): Promise<void> {
  const connection = _makeConnection(options);
  if (connection === undefined) {
    _reportMissingOptions(options);
    process.exitCode = 1;
    return;
  }
  const io = createSupabaseLocalEnvironmentIo(findRepoRoot() ?? process.cwd());
  CliTheme.progress(
    `Pointing the development env files at ${connection.apiUrl}...`,
  );
  const result = await SupabaseLocalEnvironment.switchRemote({
    io,
    connection,
  });
  CliTheme.success(
    `This worktree now uses the hosted Supabase project ${result.remoteProjectId} (${result.apiUrl}).`,
  );
  CliTheme.warning(
    "Database scripts such as `pnpm db:reset`, `pnpm db:seed`, and `pnpm test:db` refuse to run until you restore, so neither the shared local stack nor the hosted project gets reset or seeded.",
  );
  CliTheme.info("Run `ava supabase restore` to go back to a local Supabase.");
}

/** CLI for pointing a worktree at a hosted Supabase project. */
export const SupabaseSwitchRemoteCli = Acclimate.createCLI("remote")
  .description(SupabaseSwitchRemoteHelp.summary)
  .addOption({
    name: "--project-id",
    description: "Hosted project reference id",
    required: false,
    type: "string",
    askIfEmpty: IS_INTERACTIVE,
  })
  .addOption({
    name: "--api-url",
    description:
      "Project URL; leave empty for https://<project-id>.supabase.co",
    required: false,
    type: "string",
    askIfEmpty: IS_INTERACTIVE,
  })
  .addOption({
    name: "--database-url",
    description: "postgresql:// connection string",
    required: false,
    type: "string",
    askIfEmpty: IS_INTERACTIVE,
  })
  .addOption({
    name: "--publishable-key",
    description: "Publishable (anon) key",
    required: false,
    type: "string",
    askIfEmpty: IS_INTERACTIVE,
  })
  .addOption({
    name: "--secret-key",
    description: "Secret (service role) key",
    required: false,
    type: "string",
    askIfEmpty: IS_INTERACTIVE,
  })
  .action((commandArguments: Readonly<RemoteOptions>) => {
    return _run(commandArguments).catch((error: unknown) => {
      CliTheme.error({
        command: COMMAND_NAME,
        message: error instanceof Error ? error.message : String(error),
        hint: "Fix the value it names and retry. Nothing was changed unless the message says a backup was retained.",
      });
      process.exitCode = 1;
    });
  });
