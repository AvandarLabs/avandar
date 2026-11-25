type HelpEntry = Readonly<{ label: string; description: string }>;

/**
 * What one `ava plugin` subcommand documents on its own help screen: what it
 * does, how to call it, what each argument and option means, and worked
 * examples.
 */
export type PluginCommandHelp = Readonly<{
  command: string;
  purpose: string;
  usage: string;
  positionalArgs: readonly HelpEntry[];
  options: readonly HelpEntry[];
  examples: readonly string[];
}>;

function _buildSection(options: {
  title: string;
  lines: readonly string[];
}): string[] {
  return options.lines.length === 0
    ? []
    : ["", `|bright_yellow|${options.title}|reset|`, ...options.lines];
}

function _buildEntryLine(entry: HelpEntry): string {
  return `  |bright_white|${entry.label}|reset| - |gray|${entry.description}|reset|`;
}

/**
 * Makes the colored help screen a plugin subcommand prints for `--help`, so
 * every subcommand documents its purpose, usage, parameters, and examples
 * in the same layout.
 */
export function makePluginCommandHelpText(help: PluginCommandHelp): string {
  return [
    `|bright_cyan|${help.command}|reset|`,
    `  |gray|${help.purpose}|reset|`,
    ..._buildSection({ title: "Usage", lines: [`  ${help.usage}`] }),
    ..._buildSection({
      title: "Arguments",
      lines: help.positionalArgs.map(_buildEntryLine),
    }),
    ..._buildSection({
      title: "Options",
      lines: help.options.map(_buildEntryLine),
    }),
    ..._buildSection({
      title: "Examples",
      lines: help.examples.map((example) => {
        return `  ${example}`;
      }),
    }),
  ].join("\n");
}
