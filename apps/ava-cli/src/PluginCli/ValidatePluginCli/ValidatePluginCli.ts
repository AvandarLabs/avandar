import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { makePluginCommandHelpText } from "@ava-cli/PluginCli/makePluginCommandHelpText";
import {
  getRepoRootOrThrow,
  hasInteractiveTerminal,
  isKebabCaseName,
} from "@ava-cli/PluginCli/PluginCliHelpers";
import { runPluginCommandAction } from "@ava-cli/PluginCli/runPluginCommandAction/runPluginCommandAction";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import {
  readBundledPluginFolders,
  readPluginDirectory,
} from "@avandar/plugin-manifest/node";
import type { PluginCommandHelp } from "@ava-cli/PluginCli/makePluginCommandHelpText";

type CommandResult = Readonly<{ isOk: boolean; output: string }>;

/**
 * Runs an external command in `cwd` and reports whether it succeeded along
 * with everything it printed. `validatePluginCommand` takes one so a test can
 * stand in for `tsc` and `eslint`.
 */
type RunCommand = (
  command: string,
  args: string[],
  cwd: string,
) => CommandResult;

// `tsc` and `eslint` can print far more than the 1 MB spawnSync default on a
// plugin with many errors, and an overflow would read as a failed check with
// no explanation.
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024 * 1024;

const NAME_DESCRIPTION =
  "The plugin folder name under plugins/. Asked for in a terminal when " +
  "omitted. Leave it empty there, or pass no name, to validate every " +
  "bundled plugin.";
const HELP_DESCRIPTION = "Show this help and exit.";

const VALIDATE_PLUGIN_HELP: PluginCommandHelp = {
  command: "ava plugin validate",
  purpose:
    "Validate a plugin's manifest, locales, icons, approved dependencies, " +
    "types (tsc), and import lint (eslint). Validates every bundled plugin " +
    "when no name is given.",
  usage: "ava plugin validate [name] [--help]",
  positionalArgs: [{ label: "[name]", description: NAME_DESCRIPTION }],
  options: [{ label: "-h, --help", description: HELP_DESCRIPTION }],
  examples: [
    "ava plugin validate",
    "ava plugin validate epidemiology",
    "ava plugin validate    (in a terminal, asks which plugin)",
  ],
};

const _runCommandWithSpawn: RunCommand = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return {
    isOk: result.status === 0 && result.error === undefined,
    output:
      result.error === undefined
        ? output
        : `${result.error.message}\n${output}`,
  };
};

function _getManifestProblems(options: {
  folderName: string;
  repoRoot: string;
}): string[] {
  const { folderName, repoRoot } = options;
  try {
    readPluginDirectory({
      directory: join(repoRoot, "plugins", folderName),
      repoRoot,
    });
    return [];
  } catch (error: unknown) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function _getToolProblems(options: {
  folderName: string;
  repoRoot: string;
  runCommand: RunCommand;
}): string[] {
  const { folderName, repoRoot, runCommand } = options;
  printInfo("  Running tsc...");
  const typeCheck = runCommand(
    "pnpm",
    ["exec", "tsc", "-p", `plugins/${folderName}/tsconfig.json`, "--noEmit"],
    repoRoot,
  );
  printInfo("  Running eslint...");
  const lint = runCommand(
    "pnpm",
    ["exec", "eslint", `plugins/${folderName}`],
    repoRoot,
  );
  return [
    ...(typeCheck.isOk ? [] : [`tsc:\n${typeCheck.output}`]),
    ...(lint.isOk ? [] : [`eslint:\n${lint.output}`]),
  ];
}

function _validateOnePlugin(options: {
  folderName: string;
  repoRoot: string;
  runCommand: RunCommand;
}): string[] {
  const { folderName, repoRoot } = options;
  printInfo(`🔎 Validating plugins/${folderName}...`);
  printInfo("  Checking ava.yaml, locales, icons, and dependencies...");
  const manifestProblems = _getManifestProblems({ folderName, repoRoot });
  if (manifestProblems.length > 0) {
    printWarn("  ⚠️ Skipped tsc and eslint: fix the manifest problems first.");
    return manifestProblems;
  }
  return _getToolProblems(options);
}

/**
 * Validates one plugin, or every bundled plugin when no name is given:
 * manifest schema, locale keys, icons, approved dependencies, `tsc`, and the
 * import lint. Prints the result for each plugin, then throws when any
 * failed, so a script such as CI sees a nonzero exit.
 */
export function validatePluginCommand(options: {
  name?: string;
  repoRoot?: string;
  runCommand?: RunCommand;
}): void {
  const { name, runCommand = _runCommandWithSpawn } = options;
  if (name !== undefined && !isKebabCaseName(name)) {
    throw new Error(
      `Plugin name "${name}" is not kebab-case. ` +
        "Pass the folder name under plugins/, for example epidemiology.",
    );
  }
  const repoRoot = getRepoRootOrThrow(options.repoRoot);
  const folderNames =
    name === undefined ? readBundledPluginFolders(repoRoot) : [name];
  if (folderNames.length === 0) {
    printWarn(
      "⚠️ No bundled plugins are listed in plugins/bundled.yaml, " +
        "so there is nothing to validate.",
    );
    return;
  }
  const failedFolders = folderNames.filter((folderName) => {
    const problems = _validateOnePlugin({ folderName, repoRoot, runCommand });
    if (problems.length === 0) {
      printSuccess(`✅ plugins/${folderName} is valid.`);
      return false;
    }
    printError(`❌ plugins/${folderName} failed validation:`);
    problems.forEach((problem) => {
      printError(problem);
    });
    return true;
  });
  if (failedFolders.length > 0) {
    throw new Error(
      `${failedFolders.length} plugin${failedFolders.length === 1 ? "" : "s"} failed validation.`,
    );
  }
}

async function _askForPluginName(): Promise<string | undefined> {
  const answer = await Acclimate.requestInput({
    message:
      "|bright_cyan|Plugin folder to validate (leave empty for every bundled plugin):|reset|",
    params: {},
    responseOptions: { required: false, type: "string" },
  });
  const trimmed = (answer ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Runs `ava plugin validate` end to end: shows help, asks which plugin in a
 * terminal when no name is given, validates, and turns a failure into an
 * error message and a nonzero exit code. The CLI action calls it, and tests
 * call it with a fake terminal, repository root, and command runner.
 */
export function runValidatePluginCli(options: {
  name?: string;
  help?: boolean;
  isInteractive?: boolean;
  repoRoot?: string;
  runCommand?: RunCommand;
}): Promise<void> {
  const { name, help, isInteractive, repoRoot, runCommand } = options;
  return runPluginCommandAction({
    commandName: VALIDATE_PLUGIN_HELP.command,
    helpText: makePluginCommandHelpText(VALIDATE_PLUGIN_HELP),
    isHelpRequested: help === true,
    run: async () => {
      const pluginName =
        name ??
        ((isInteractive ?? hasInteractiveTerminal())
          ? await _askForPluginName()
          : undefined);
      validatePluginCommand({ name: pluginName, repoRoot, runCommand });
    },
  });
}

/** CLI for validating bundled plugins. */
export const ValidatePluginCli = Acclimate.createCLI("validate")
  .description(
    `${VALIDATE_PLUGIN_HELP.purpose} Example: ava plugin validate epidemiology.`,
  )
  .addPositionalArg({
    name: "name",
    required: false,
    description: NAME_DESCRIPTION,
    type: "string",
  })
  .addOption({
    name: "--help",
    aliases: ["-h"] as const,
    type: "boolean",
    required: false,
    description: HELP_DESCRIPTION,
  })
  .action((args: Readonly<{ name?: string; help?: boolean }>) => {
    return runValidatePluginCli(args);
  });
