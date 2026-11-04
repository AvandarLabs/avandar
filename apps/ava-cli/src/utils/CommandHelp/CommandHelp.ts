import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";

/** One labelled line of a help screen: an argument, option, or example. */
export type CommandHelpEntry = {
  label: string;
  description: string;
};

/**
 * Everything one command's `--help` shows, and the flags it accepts.
 *
 * The flags a command accepts come from `options` labels, so the help screen
 * and the unknown-flag check cannot drift apart.
 */
export type CommandHelpSpec = {
  /** Words after `ava` that name the command, e.g. `["supabase", "prune"]`. */
  commandPath: readonly string[];
  summary: string;
  usage: readonly string[];
  arguments?: readonly CommandHelpEntry[];
  options: readonly CommandHelpEntry[];
  examples: readonly CommandHelpEntry[];
};

const HELP_FLAGS = ["--help", "-h"] as const;

const HELP_ENTRY: CommandHelpEntry = {
  label: "-h, --help",
  description: "Show this help and exit without doing anything else.",
};

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

function _getFlagsFromSpec(spec: Readonly<CommandHelpSpec>): string[] {
  return spec.options.flatMap(({ label }) => {
    return label.split(",").flatMap((part) => {
      const flag = part.trim().split(/\s+/)[0] ?? "";
      return flag.startsWith("-") ? [flag] : [];
    });
  });
}

function _findUnknownFlags(
  options: Readonly<{
    argv: readonly string[];
    spec: CommandHelpSpec;
    globalFlags: readonly string[];
  }>,
): string[] {
  const knownFlags = new Set([
    ..._getFlagsFromSpec(options.spec),
    ...options.globalFlags,
    ...HELP_FLAGS,
  ]);
  return options.argv.filter((token) => {
    if (!token.startsWith("-")) {
      return false;
    }
    const [flag = token] = token.split("=");
    return !knownFlags.has(flag);
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
  if (entries.length === 0) {
    return [];
  }
  const labelWidth = Math.max(
    ...entries.map(({ label }) => {
      return label.length;
    }),
  );
  return [
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

function _makeHelpLines(
  options: Readonly<{
    spec: CommandHelpSpec;
    globalOptions: readonly CommandHelpEntry[];
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
    `  ${spec.summary}`,
    "",
    CliTheme.paint({ style: "heading", text: "Usage", isColorEnabled }),
    ...spec.usage.map((line) => {
      return `  ${line}`;
    }),
    ..._makeSectionLines({
      title: "Arguments",
      entries: spec.arguments ?? [],
      isColorEnabled,
    }),
    ..._makeSectionLines({
      title: "Options",
      entries: [...spec.options, HELP_ENTRY],
      isColorEnabled,
    }),
    ..._makeSectionLines({
      title: "Global options",
      entries: options.globalOptions,
      isColorEnabled,
    }),
    ..._makeSectionLines({
      title: "Examples",
      entries: spec.examples,
      isColorEnabled,
    }),
  ];
}

/**
 * Help screens and flag checking for `ava` commands, handled before Acclimate
 * parses anything.
 *
 * Acclimate ignores `--help` and any flag it does not know, so without this a
 * `--help` or a mistyped flag would run the command. The entry point uses it
 * to print help and exit, or to refuse an unknown flag with the usage.
 */
export const CommandHelp = {
  /** The spec of the deepest command the leading argv words name. */
  findSpecFromArgv: _findSpecFromArgv,

  /** Whether argv asks for help, which wins over every other argument. */
  wantsHelp: (argv: readonly string[]): boolean => {
    return HELP_FLAGS.some((flag) => {
      return argv.includes(flag);
    });
  },

  /** Flags in argv that neither the command nor the root declares. */
  findUnknownFlags: _findUnknownFlags,

  /** The lines of one command's help screen. */
  makeHelpLines: _makeHelpLines,
};
