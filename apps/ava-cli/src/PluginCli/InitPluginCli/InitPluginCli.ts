import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { makePluginScaffoldFilesFromName } from "@ava-cli/PluginCli/InitPluginCli/makePluginScaffoldFilesFromName";
import { makePluginCommandHelpText } from "@ava-cli/PluginCli/makePluginCommandHelpText";
import {
  getRepoRootOrThrow,
  hasInteractiveTerminal,
  isKebabCaseName,
} from "@ava-cli/PluginCli/PluginCliHelpers";
import { runPluginCommandAction } from "@ava-cli/PluginCli/runPluginCommandAction/runPluginCommandAction";
import { printInfo, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";
import type { PluginCommandHelp } from "@ava-cli/PluginCli/makePluginCommandHelpText";
import type { Document } from "yaml";

const DEFAULT_PUBLISHER = "avandar";
const BUNDLED_LIST_PATH = "plugins/bundled.yaml";
const BUNDLED_LIST_HEADER =
  "# Plugin folders under plugins/ that this deployment bundles into the app.\n";

const NAME_DESCRIPTION =
  "The plugin folder name, in kebab-case. Asked for in a terminal when omitted.";
const PUBLISHER_DESCRIPTION = `The publisher part of the plugin id (publisher.name). Defaults to ${DEFAULT_PUBLISHER}.`;
const HELP_DESCRIPTION = "Show this help and exit.";

const INIT_PLUGIN_HELP: PluginCommandHelp = {
  command: "ava plugin init",
  purpose:
    "Scaffold a bundled plugin under plugins/ with a working hello command, " +
    "and list it in plugins/bundled.yaml.",
  usage: "ava plugin init [name] [--publisher <publisher>] [--help]",
  positionalArgs: [{ label: "[name]", description: NAME_DESCRIPTION }],
  options: [
    { label: "--publisher <publisher>", description: PUBLISHER_DESCRIPTION },
    { label: "-h, --help", description: HELP_DESCRIPTION },
  ],
  examples: [
    "ava plugin init case-tools",
    "ava plugin init case-tools --publisher acme",
    "ava plugin init    (in a terminal, asks for each value)",
  ],
};

function _assertKebabCase(options: { label: string; value: string }): void {
  if (!isKebabCaseName(options.value)) {
    throw new Error(
      `${options.label} "${options.value}" is not kebab-case. ` +
        "Use lowercase letters, digits, and single hyphens, " +
        "for example case-tools.",
    );
  }
}

function _addNameToPluginsList(options: {
  document: Document;
  name: string;
}): void {
  const { document, name } = options;
  const plugins = document.get("plugins", true);
  if (isSeq(plugins)) {
    const isListed = plugins.items.some((item) => {
      return isScalar(item) && item.value === name;
    });
    if (!isListed) {
      // An empty `[]` would print as `plugins: [case-tools]`, so a first
      // entry switches the list to the block style the file otherwise uses.
      plugins.flow = plugins.items.length === 0 ? false : plugins.flow;
      plugins.add(document.createNode(name));
    }
    return;
  }
  const isPluginsEmpty =
    plugins === undefined || (isScalar(plugins) && plugins.value === null);
  if (!isPluginsEmpty) {
    throw new Error(
      `${BUNDLED_LIST_PATH} must hold a plugins list of folder names.`,
    );
  }
  document.set("plugins", document.createNode([name]));
}

function _makeBundledListWithPlugin(options: {
  currentText: string | undefined;
  name: string;
}): string {
  const { name } = options;
  const sourceText =
    options.currentText ?? `${BUNDLED_LIST_HEADER}plugins: []\n`;
  const document = parseDocument(sourceText);
  const [firstError] = document.errors;
  if (firstError !== undefined) {
    throw new Error(
      `${BUNDLED_LIST_PATH} is not valid YAML: ${firstError.message}`,
    );
  }
  if (document.contents === null) {
    // A file holding only comments has no map to add to, so append one.
    const separator =
      sourceText === "" || sourceText.endsWith("\n") ? "" : "\n";
    return `${sourceText}${separator}plugins:\n  - ${name}\n`;
  }
  if (!isMap(document.contents)) {
    throw new Error(`${BUNDLED_LIST_PATH} must be a map with a plugins list.`);
  }
  _addNameToPluginsList({ document, name });
  return document.toString();
}

function _writePluginFiles(options: {
  directory: string;
  name: string;
  publisher: string;
}): void {
  const { directory, name, publisher } = options;
  Object.entries(makePluginScaffoldFilesFromName({ name, publisher })).forEach(
    ([path, contents]) => {
      const filePath = join(directory, path);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, contents);
    },
  );
}

/**
 * Scaffolds `plugins/<name>/` and lists it in `plugins/bundled.yaml`, keeping
 * the file's comments and order. Use it to start a new bundled plugin. It
 * throws, before writing anything, when a name is not kebab-case, the plugin
 * folder exists, or `bundled.yaml` cannot be read as a plugin list.
 */
export function initPluginCommand(options: {
  name: string;
  publisher: string;
  repoRoot?: string;
}): void {
  const { name, publisher } = options;
  _assertKebabCase({ label: "Plugin name", value: name });
  _assertKebabCase({ label: "Publisher", value: publisher });
  const repoRoot = getRepoRootOrThrow(options.repoRoot);
  const directory = join(repoRoot, "plugins", name);
  if (existsSync(directory)) {
    throw new Error(`plugins/${name} already exists. Pick another name.`);
  }
  const bundledListPath = join(repoRoot, BUNDLED_LIST_PATH);
  const bundledListText = _makeBundledListWithPlugin({
    currentText: existsSync(bundledListPath)
      ? readFileSync(bundledListPath, "utf8")
      : undefined,
    name,
  });
  printInfo(`Scaffolding plugins/${name} (plugin id ${publisher}.${name})...`);
  _writePluginFiles({ directory, name, publisher });
  writeFileSync(bundledListPath, bundledListText);
  printSuccess(
    `✅ Created plugins/${name} and listed it in ${BUNDLED_LIST_PATH}.`,
  );
  printInfo(
    `Next: pnpm install, then ava plugin validate ${name}, then pnpm dev.`,
  );
}

async function _askForValue(options: {
  message: string;
  defaultValue?: string;
}): Promise<string> {
  const { message, defaultValue } = options;
  const answer = await Acclimate.requestInput({
    message: `|bright_cyan|${message}|reset|`,
    params: {},
    responseOptions: {
      required: true,
      type: "string",
      ...(defaultValue === undefined ? {} : { defaultValue }),
    },
  });
  return (answer ?? "").trim();
}

async function _resolveInitOptions(options: {
  name?: string;
  publisher?: string;
  isInteractive: boolean;
}): Promise<{ name: string; publisher: string }> {
  const { name, publisher, isInteractive } = options;
  if (name !== undefined) {
    return { name, publisher: publisher ?? DEFAULT_PUBLISHER };
  }
  if (!isInteractive) {
    throw new Error(
      "A plugin name is required, and there is no terminal to ask for it. " +
        "Run: ava plugin init <name> [--publisher <publisher>]",
    );
  }
  const askedName = await _askForValue({
    message: "Plugin name (kebab-case, for example case-tools):",
  });
  const askedPublisher =
    publisher ??
    (await _askForValue({
      message: "Publisher (the first part of the plugin id):",
      defaultValue: DEFAULT_PUBLISHER,
    }));
  return { name: askedName, publisher: askedPublisher };
}

/**
 * Runs `ava plugin init` end to end: shows help, asks for a missing name in a
 * terminal, scaffolds the plugin, and turns a failure into an error message
 * and a nonzero exit code. The CLI action calls it, and tests call it with a
 * fake terminal and repository root.
 */
export function runInitPluginCli(options: {
  name?: string;
  publisher?: string;
  help?: boolean;
  isInteractive?: boolean;
  repoRoot?: string;
}): Promise<void> {
  const { name, publisher, help, isInteractive, repoRoot } = options;
  return runPluginCommandAction({
    commandName: INIT_PLUGIN_HELP.command,
    helpText: makePluginCommandHelpText(INIT_PLUGIN_HELP),
    isHelpRequested: help === true,
    run: async () => {
      const initOptions = await _resolveInitOptions({
        name,
        publisher,
        isInteractive: isInteractive ?? hasInteractiveTerminal(),
      });
      initPluginCommand({ ...initOptions, repoRoot });
    },
  });
}

/** CLI for scaffolding a new bundled plugin. */
export const InitPluginCli = Acclimate.createCLI("init")
  .description(
    `${INIT_PLUGIN_HELP.purpose} Example: ava plugin init case-tools.`,
  )
  .addPositionalArg({
    name: "name",
    required: false,
    description: NAME_DESCRIPTION,
    type: "string",
  })
  .addOption({
    name: "--publisher",
    type: "string",
    required: false,
    description: PUBLISHER_DESCRIPTION,
  })
  .addOption({
    name: "--help",
    aliases: ["-h"] as const,
    type: "boolean",
    required: false,
    description: HELP_DESCRIPTION,
  })
  .action(
    (args: Readonly<{ name?: string; publisher?: string; help?: boolean }>) => {
      return runInitPluginCli(args);
    },
  );
