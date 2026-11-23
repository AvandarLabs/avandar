#!/usr/bin/env node
/* oxlint-disable import/extensions -- Node needs source extensions. */
import { collectCoverage } from "./coverageHelpers.ts";
import { createCssCoverageProbes } from "./createCssCoverageProbes.ts";
import { createNativeCoverageProbes } from "./nativeSafeRules/createNativeCoverageProbes.ts";
import {
  buildHelpText,
  createTheme,
  openTerminal,
  type PromptIo,
} from "./terminalHelpers.ts";

export { getMenuSelectionFromKey } from "./terminalHelpers.ts";

const HELP: string = `Inspect proven lint coverage for exact files and capabilities.

Usage: avandar-lint
       avandar-lint coverage [PATH]... [--format stylish|agent|json] [--no-prompt]

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
values bypass prompts. A missing --format value prompts only for the format,
unless --no-prompt is supplied. JSON stdout contains only the coverage result. Progress
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
 * Collects coverage paths and output format with visible defaults.
 * For example, use it to configure coverage through a terminal prompt.
 * Returns the selected paths and format.
 */
export async function runCoverageWizard(
  prompt: Readonly<PromptIo>,
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
  const formats: Format[] = args.flatMap((argument, index) => {
    if (argument === "--format") {
      const format = FORMATS.find((candidate) => {
        return candidate === args[index + 1];
      });
      if (!format) {
        throw new Error("--format requires stylish, agent, or json");
      }
      return [format];
    }
    if (
      args[index - 1] !== "--format" &&
      argument !== "--no-prompt" &&
      argument.startsWith("-")
    ) {
      throw new Error(`Unknown option: ${argument}`);
    }
    return [];
  });
  const paths: string[] = args.filter((argument, index) => {
    return (
      argument !== "--format" &&
      argument !== "--no-prompt" &&
      args[index - 1] !== "--format"
    );
  });
  return {
    paths: paths.length ? paths : ["."],
    format: formats.at(-1) ?? "stylish",
  };
}

async function _getExplicitOptions({
  args,
  terminal,
}: Readonly<{
  args: readonly string[];
  terminal: () => PromptIo | undefined;
}>): Promise<Options> {
  const missingIndex = args.findIndex((argument, index) => {
    const value = args[index + 1];
    return argument === "--format" && (!value || value.startsWith("-"));
  });
  if (missingIndex === -1) {
    return _parseOptions(args);
  }
  _parseOptions(args.toSpliced(missingIndex + 1, 0, "stylish"));
  const prompt = args.includes("--no-prompt") ? undefined : terminal();
  if (!prompt) {
    throw new Error(
      "--format requires a value. Try avandar-lint coverage --format json --no-prompt",
    );
  }
  try {
    const selection = await prompt.choose("Format", FORMATS, 0);
    const format = FORMATS[selection];
    if (!format) {
      throw new Error("Choose stylish, agent, or json for --format");
    }
    return _parseOptions(args.toSpliced(missingIndex + 1, 0, format));
  } finally {
    prompt.close?.();
  }
}

async function _getOptions({
  args,
  terminal,
}: Readonly<{
  args: readonly string[];
  terminal: () => PromptIo | undefined;
}>): Promise<Options> {
  if (args.length) {
    return _getExplicitOptions({ args, terminal });
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

type CliIo = {
  cwd?: string;
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
  terminal?: () => PromptIo | undefined;
};
type OutputIo = {
  cwd?: string;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  theme: ReturnType<typeof createTheme>;
};

async function _selectAction(
  terminal: () => PromptIo | undefined,
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

function _writeResult({
  result,
  format,
  io,
}: Readonly<{
  result: Awaited<ReturnType<typeof collectCoverage>>;
  format: Format;
  io: Readonly<OutputIo>;
}>): void {
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
    const failures = new Set(
      result.outcomes
        .filter((outcome) => {
          return !outcome.operational;
        })
        .map((outcome) => {
          return outcome.recovery;
        }),
    );
    failures.forEach((failure) => {
      if (failure) {
        io.stderr(`${io.theme.error(`❌ ${failure}`)}\n`);
      }
    });
    io.stderr(
      `${io.theme.warning("  ⚠️ Repair the reported engine error and retry coverage.")}\n`,
    );
  }
}

async function _executeCoverage({
  options,
  io,
}: Readonly<{
  options: Readonly<Options>;
  io: Readonly<OutputIo>;
}>): Promise<number> {
  io.stderr(`${io.theme.heading("Checking coverage for reviewed paths...")}\n`);
  const timer = setInterval(() => {
    io.stderr("Still checking coverage...\n");
  }, 10000);
  try {
    const { loadRuleCatalog } = await import("../catalog/loadRuleCatalog.ts");
    const result = await collectCoverage({
      catalog: loadRuleCatalog(),
      probes: [...createNativeCoverageProbes(), ...createCssCoverageProbes()],
      paths: options.paths,
      cwd: io.cwd,
    });
    _writeResult({ result: result, format: options.format, io: io });
    return result.operational ? 0 : 1;
  } finally {
    clearInterval(timer);
  }
}

/**
 * Runs the coverage CLI with separate output and diagnostic streams.
 * For example, use it to execute coverage with injectable IO in an integration
 * test.
 * Returns zero on completion or help, and one on an operational error.
 */
export async function runCli({
  args,
  io = {},
}: Readonly<{
  args: readonly string[];
  io?: Readonly<CliIo>;
}>): Promise<number> {
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
    stdout(
      buildHelpText({
        text: HELP,
        isTerminal: !io.stdout && Boolean(process.stdout.isTTY),
      }),
    );
    return 0;
  }
  try {
    if (args[0] && args[0] !== "coverage") {
      throw new Error(`Unknown command: ${args[0]}`);
    }
    if (!args.length) {
      await _selectAction(io.terminal ?? openTerminal);
    }
    const options = await _getOptions({
      args: args.slice(1),
      terminal: io.terminal ?? openTerminal,
    });
    return await _executeCoverage({
      options: options,
      io: {
        stdout,
        stderr,
        theme,
        cwd: io.cwd,
      },
    });
  } catch (error) {
    stderr(
      `${theme.error(`❌ avandar-lint: ${error instanceof Error ? error.message : String(error)}`)}\n${theme.warning("  ⚠️ Run avandar-lint coverage --help, correct the invocation or reported path, and retry.")}\n\n${buildHelpText({ text: HELP, isTerminal: !io.stderr && Boolean(process.stderr.isTTY) })}`,
    );
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await runCli({ args: process.argv.slice(2) });
}
