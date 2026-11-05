import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import type {
  AnyCLI,
  CLIOptionParam,
  CLIPositionalParam,
} from "@avandar/acclimate";

/** One labelled line of a help screen: an argument, option, or example. */
export type CommandHelpEntry = {
  label: string;
  description: string;
};

/**
 * What one command's `--help` adds to the command's own declarations.
 *
 * The summary, arguments, and options are read from `cli`, so the help screen,
 * the unknown-flag check, and Acclimate's parser all share one definition.
 */
export type CommandHelpSpec = {
  /** Words after `ava` that name the command, e.g. `["supabase", "prune"]`. */
  commandPath: string[];
  cli: AnyCLI;
  usage: string[];
  examples: CommandHelpEntry[];
  /**
   * Display labels keyed by argument or option name, such as
   * `{ "--branch": "<name>" }` for an option's value or
   * `{ temporaryProjectId: "[project-id]" }` for an argument.
   */
  labels?: Record<string, string>;
};

/** What `CommandHelp.handleArgv` did, which decides the exit status. */
export type CommandHelpOutcome = "printedHelp" | "refusedFlag" | "continue";

const HELP_FLAGS = ["--help", "-h"];

function _getLeadingWords(argv: readonly string[]): string[] {
  const firstFlagIndex = argv.findIndex((token) => {
    return token.startsWith("-");
  });
  return firstFlagIndex === -1 ? [...argv] : argv.slice(0, firstFlagIndex);
}

function _findSpecFromArgv(
  options: Readonly<{
    argv: readonly string[];
    specs: readonly CommandHelpSpec[];
  }>,
): CommandHelpSpec | undefined {
  const leadingWords = _getLeadingWords(options.argv);
  return options.specs
    .filter(({ commandPath }) => {
      return commandPath.every((word, index) => {
        return leadingWords[index] === word;
      });
    })
    .toSorted((left, right) => {
      return right.commandPath.length - left.commandPath.length;
    })[0];
}

function _getOptionParams(
  optionArgs: Readonly<Record<string, CLIOptionParam>>,
): CLIOptionParam[] {
  return Object.values(optionArgs);
}

function _getFlagsFromOptions(options: readonly CLIOptionParam[]): string[] {
  return options.flatMap(({ name, aliases }) => {
    return [name, ...(aliases ?? [])];
  });
}

function _findUnknownFlags(
  options: Readonly<{
    argv: readonly string[];
    spec: Readonly<CommandHelpSpec>;
    rootCli: AnyCLI;
  }>,
): string[] {
  const knownFlags = new Set([
    ..._getFlagsFromOptions(
      _getOptionParams(options.spec.cli.state.optionArgs),
    ),
    ..._getFlagsFromOptions(
      _getOptionParams(options.rootCli.state.globalOptionArgs),
    ),
    ...HELP_FLAGS,
  ]);
  return options.argv.filter((token) => {
    return token.startsWith("-") && !knownFlags.has(token.split("=")[0] ?? "");
  });
}

function _makeOptionEntries(
  options: Readonly<{
    params: readonly CLIOptionParam[];
    labels: Readonly<Record<string, string>>;
  }>,
): CommandHelpEntry[] {
  return options.params.map(({ name, aliases, type, description }) => {
    const flags = [...(aliases ?? []), name].join(", ");
    const valueLabel =
      type === "boolean" ? "" : ` ${options.labels[name] ?? "<value>"}`;
    return { label: `${flags}${valueLabel}`, description: description ?? "" };
  });
}

function _makeArgumentEntries(
  options: Readonly<{
    params: readonly CLIPositionalParam[];
    labels: Readonly<Record<string, string>>;
  }>,
): CommandHelpEntry[] {
  return options.params.map(({ name, required, description }) => {
    return {
      label: options.labels[name] ?? (required ? `<${name}>` : `[${name}]`),
      description: description ?? "",
    };
  });
}

function _makeSectionLines(
  options: Readonly<{
    title: string;
    entries: readonly CommandHelpEntry[];
    isColorEnabled: boolean;
  }>,
): string[] {
  const { title, entries, isColorEnabled } = options;
  const labelWidth = Math.max(
    ...entries.map(({ label }) => {
      return label.length;
    }),
  );
  return entries.length === 0
    ? []
    : [
        "",
        CliTheme.paint({ style: "heading", text: title, isColorEnabled }),
        ...entries.map(({ label, description }) => {
          const paddedLabel = CliTheme.paint({
            style: "value",
            text: label.padEnd(labelWidth),
            isColorEnabled,
          });
          return `  ${paddedLabel}  ${description}`;
        }),
      ];
}

/** Every titled section of a help screen, in the order they print. */
function _makeHelpSections(
  options: Readonly<{ spec: Readonly<CommandHelpSpec>; rootCli: AnyCLI }>,
): Array<{ title: string; entries: CommandHelpEntry[] }> {
  const { spec } = options;
  const labels = spec.labels ?? {};
  const commandOptions = _makeOptionEntries({
    params: _getOptionParams(spec.cli.state.optionArgs),
    labels,
  });
  return [
    {
      title: "Arguments",
      entries: _makeArgumentEntries({
        params: spec.cli.state.positionalArgs,
        labels,
      }),
    },
    {
      title: "Options",
      entries: [
        ...commandOptions,
        {
          label: "-h, --help",
          description: "Show this help and exit without doing anything else.",
        },
      ],
    },
    {
      title: "Global options",
      entries: _makeOptionEntries({
        params: _getOptionParams(options.rootCli.state.globalOptionArgs),
        labels,
      }),
    },
    { title: "Examples", entries: spec.examples },
  ];
}

function _makeHelpLines(
  options: Readonly<{
    spec: Readonly<CommandHelpSpec>;
    rootCli: AnyCLI;
    isColorEnabled: boolean;
  }>,
): string[] {
  const { spec, isColorEnabled } = options;
  return [
    CliTheme.paint({
      style: "heading",
      text: `ava ${spec.commandPath.join(" ")}`,
      isColorEnabled,
    }),
    `  ${spec.cli.state.description ?? ""}`,
    "",
    CliTheme.paint({ style: "heading", text: "Usage", isColorEnabled }),
    ...spec.usage.map((line) => {
      return `  ${line}`;
    }),
    ..._makeHelpSections(options).flatMap((section) => {
      return _makeSectionLines({ ...section, isColorEnabled });
    }),
  ];
}

function _isHelpRequested(argv: readonly string[]): boolean {
  return HELP_FLAGS.some((flag) => {
    return argv.includes(flag);
  });
}

function _writeHelp(
  options: Readonly<{
    spec: Readonly<CommandHelpSpec>;
    rootCli: AnyCLI;
    stream: NodeJS.WriteStream;
  }>,
): void {
  _makeHelpLines({
    ...options,
    isColorEnabled: CliTheme.isColorEnabled({
      stream: options.stream,
      env: process.env,
    }),
  }).forEach((line) => {
    options.stream.write(`${line}\n`);
  });
}

function _handleArgv(
  options: Readonly<{
    argv: readonly string[];
    specs: readonly CommandHelpSpec[];
    rootCli: AnyCLI;
  }>,
): CommandHelpOutcome {
  const { argv, rootCli } = options;
  const spec = _findSpecFromArgv(options);
  if (spec === undefined) {
    return "continue";
  }
  if (_isHelpRequested(argv)) {
    _writeHelp({ spec, rootCli, stream: process.stdout });
    return "printedHelp";
  }
  const unknownFlags = _findUnknownFlags({ argv, spec, rootCli });
  if (unknownFlags.length === 0) {
    return "continue";
  }
  const command = `ava ${spec.commandPath.join(" ")}`;
  _writeHelp({ spec, rootCli, stream: process.stderr });
  process.stderr.write("\n");
  CliTheme.error({
    command,
    message: `Unknown option ${unknownFlags.join(", ")}.`,
    hint: `Run \`${command} --help\` for the options it accepts.`,
  });
  return "refusedFlag";
}

/**
 * Help screens and flag checking for `ava` commands, run before Acclimate
 * parses anything.
 *
 * Acclimate ignores `--help` and any flag it does not know, so without this a
 * `--help` or a mistyped flag would run the command. Use it ahead of
 * `Acclimate.run`, for example to print a command's help and exit, or to
 * refuse an unknown flag and show the usage instead.
 */
export const CommandHelp = {
  /** The spec of the deepest command the leading argv words name. */
  findSpecFromArgv: _findSpecFromArgv,

  /** Whether argv asks for help, which wins over every other argument. */
  isHelpRequested: _isHelpRequested,

  /** Flags in argv that neither the command nor the root declares. */
  findUnknownFlags: _findUnknownFlags,

  /** The lines of one command's help screen. */
  makeHelpLines: _makeHelpLines,

  /**
   * Prints help or refuses an unknown flag for a command with a spec, and
   * says which it did. `"continue"` means Acclimate should run as usual.
   */
  handleArgv: _handleArgv,
};
