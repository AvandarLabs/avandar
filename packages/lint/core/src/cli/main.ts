#!/usr/bin/env node
/* oxlint-disable import/extensions -- Node needs source extensions. */
import { collectCoverage } from "./coverage.ts";
import { createTheme, openTerminal, type PromptIO } from "./terminal.ts";

export { getMenuSelection } from "./terminal.ts";

const HELP = `Inspect proven lint coverage for exact files and capabilities.

Usage: avandar-lint [coverage] [PATH]... [--format stylish|agent|json] [--no-prompt]

Commands:
  coverage                 Report enforced, not-applicable, or fallback outcomes.

Arguments:
  PATH                     File or directory, repeatable. Default: current directory.

Options:
  --format stylish|agent|json  Output format. Default: stylish.
  --no-prompt               Use defaults without opening the terminal wizard.
  -h, --help                Print help and exit before repository access.

A bare root opens the action menu; bare coverage offers paths and format in a
controlling terminal. Without a terminal, defaults execute immediately. Explicit
arguments never prompt. JSON stdout contains only the coverage result. Progress
and recovery advice use stderr. Unknown or unproven capabilities remain fallback.
Operational failures exit 1; completed coverage (including fallback) exits 0.

Examples:
  avandar-lint coverage src/example.ts --format json
  avandar-lint coverage src shared --format agent --no-prompt
`;
const FORMATS = ["stylish", "agent", "json"] as const;
type Format = (typeof FORMATS)[number];
type Options = { paths: string[]; format: Format };

/**
 * Offers every coverage option and visible defaults through reusable wizard
 * IO.
 */
export async function runCoverageWizard(
  prompt: Readonly<PromptIO>,
): Promise<Options> {
  const paths = (await prompt.ask("Paths (comma-separated)", "."))
    .split(",")
    .map((path) => {
      return path.trim();
    })
    .filter(Boolean);
  const format =
    FORMATS[await prompt.choose("Format", FORMATS, 0)] ?? "stylish";
  return { paths: paths.length ? paths : ["."], format };
}

function _parseOptions(args: readonly string[]): Options {
  const result: Options = { paths: [], format: "stylish" };
  args.forEach((argument, index) => {
    if (argument === "--format") {
      const format = args[index + 1];
      if (!FORMATS.includes(format as Format)) {
        throw new Error("--format requires stylish, agent, or json");
      }
      result.format = format as Format;
    } else if (args[index - 1] !== "--format" && argument !== "--no-prompt") {
      if (argument.startsWith("-")) {
        throw new Error(`Unknown option: ${argument}`);
      }
      result.paths.push(argument);
    }
  });
  return { ...result, paths: result.paths.length ? result.paths : ["."] };
}

async function _getOptions(
  args: readonly string[],
  terminal: () => PromptIO | undefined,
): Promise<Options> {
  if (args.length) {
    return _parseOptions(args);
  }
  const prompt = terminal();
  if (!prompt) {
    return { paths: ["."], format: "stylish" };
  }
  try {
    return await runCoverageWizard(prompt);
  } finally {
    prompt.close?.();
  }
}

type CliIO = {
  cwd?: string;
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
  terminal?: () => PromptIO | undefined;
};
type OutputIO = {
  cwd?: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  theme: ReturnType<typeof createTheme>;
};

async function _selectAction(
  terminal: () => PromptIO | undefined,
): Promise<void> {
  const prompt = terminal();
  if (prompt) {
    try {
      await prompt.choose("Action", ["coverage"], 0);
    } finally {
      prompt.close?.();
    }
  }
}

function _writeResult(
  result: Awaited<ReturnType<typeof collectCoverage>>,
  format: Format,
  io: Readonly<OutputIO>,
): void {
  io.stdout(
    format === "json"
      ? `${JSON.stringify(result)}\n`
      : `${result.outcomes
          .map((outcome) => {
            return `${outcome.ruleId} ${outcome.language} ${outcome.path} [${outcome.capability}] ${outcome.state}${outcome.recovery ? `: ${outcome.recovery}` : ""}`;
          })
          .join("\n")}\n`,
  );
  io.stderr(
    `${result.operational ? io.theme.success("✅ Coverage complete") : io.theme.error("❌ Coverage encountered engine errors")}: ${result.outcomes.length} outcomes.\n`,
  );
  if (!result.operational) {
    io.stderr(
      `${io.theme.warning("  ⚠️ Repair the reported engine error and retry coverage.")}\n`,
    );
  }
}

async function _executeCoverage(
  options: Readonly<Options>,
  io: Readonly<OutputIO>,
): Promise<number> {
  io.stderr(`${io.theme.heading("Checking coverage for reviewed paths...")}\n`);
  const timer = setInterval(() => {
    io.stderr("Still checking coverage...\n");
  }, 10000);
  try {
    const { loadRuleCatalog } = await import("../catalog/loadRuleCatalog.ts");
    const result = await collectCoverage({
      catalog: loadRuleCatalog(),
      paths: options.paths,
      cwd: io.cwd,
    });
    _writeResult(result, options.format, io);
    return result.operational ? 0 : 1;
  } finally {
    clearInterval(timer);
  }
}

/** Checks coverage with separate terminal and machine data streams. */
export async function runCli(
  args: readonly string[],
  io: Readonly<CliIO> = {},
): Promise<number> {
  const stdout =
    io.stdout ??
    ((value: string) => {
      process.stdout.write(value);
    });
  const stderr =
    io.stderr ??
    ((value: string) => {
      process.stderr.write(value);
    });
  const theme = createTheme(!io.stderr && Boolean(process.stderr.isTTY));
  if (args.includes("--help") || args.includes("-h")) {
    stdout(HELP);
    return 0;
  }
  try {
    if (args[0] && args[0] !== "coverage") {
      throw new Error(`Unknown command: ${args[0]}`);
    }
    if (!args.length) {
      await _selectAction(io.terminal ?? openTerminal);
    }
    const options = await _getOptions(
      args.slice(1),
      io.terminal ?? openTerminal,
    );
    return await _executeCoverage(options, {
      stdout,
      stderr,
      theme,
      cwd: io.cwd,
    });
  } catch (error) {
    stderr(
      `${theme.error(`❌ avandar-lint: ${error instanceof Error ? error.message : String(error)}`)}\n${theme.warning("  ⚠️ Run avandar-lint coverage --help, correct the invocation or reported path, and retry.")}\n\n${HELP}`,
    );
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await runCli(process.argv.slice(2));
}
