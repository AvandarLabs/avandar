#!/usr/bin/env node
/* oxlint-disable import/extensions -- Node needs source extensions. */
import {
  Acclimate,
  CLIError,
  openTerminalSession,
} from "@avandar/acclimate";
import type {
  AnyCLI,
  ChoiceMenuItem,
  PromptIo,
  TerminalInputStream,
  TerminalOutputStream,
  TerminalSession,
} from "@avandar/acclimate";
import { collectCoverage } from "./coverageHelpers.ts";
import { createCssCoverageProbes } from "./createCssCoverageProbes.ts";
import { createNativeCoverageProbes } from "./nativeSafeRules/createNativeCoverageProbes.ts";

const FORMATS = ["stylish", "agent", "json"] as const;
const FORMAT_CHOICES: ReadonlyArray<ChoiceMenuItem<Format>> = [
  { value: "stylish", label: "stylish" },
  { value: "agent", label: "agent" },
  { value: "json", label: "json" },
];
const USAGE_SYNOPSIS =
  "avandar-lint coverage [PATH]... [--format stylish|agent|json] [--no-prompt]";
const EXAMPLES = [
  { command: "avandar-lint coverage src/example.ts --format json" },
  { command: "avandar-lint coverage src shared --format agent --no-prompt" },
] as const;

type Format = (typeof FORMATS)[number];
type CoverageOptions = { paths: string[]; format: Format };
type CliIo = {
  cwd?: string;
  stdin?: TerminalInputStream;
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
  env?: Readonly<Record<string, string | undefined>>;
  isStdoutTTY?: boolean;
  isStderrTTY?: boolean;
  interactive?: boolean;
  terminal?: TerminalSession;
  promptIo?: PromptIo;
  openTty?: () => Promise<TerminalSession | undefined>;
};
type WizardOptions = {
  terminal?: TerminalSession;
  promptIo?: PromptIo;
  stdin?: TerminalInputStream;
  stdout?: TerminalOutputStream;
  stderr?: TerminalOutputStream;
  env?: Readonly<Record<string, string | undefined>>;
  interactive?: boolean;
  openTty?: () => Promise<TerminalSession | undefined>;
};

function _toOutputStream(
  write: ((value: string) => void) | undefined,
  isTTY: boolean | undefined,
): TerminalOutputStream | undefined {
  if (!write) {
    return undefined;
  }
  return { write, isTTY: isTTY ?? false };
}

function _toSessionFromPromptIo(promptIo: Readonly<PromptIo>): TerminalSession {
  return {
    input: promptIo.input,
    output: promptIo.output,
    isColorEnabled: promptIo.isColorEnabled ?? false,
    isRawModeSupported: promptIo.isRawModeSupported ?? false,
    close: async () => {
      await promptIo.close?.();
    },
  };
}

function _buildSessionOptions(
  io: Readonly<CliIo>,
  isPromptDisabled: boolean,
): Parameters<typeof openTerminalSession>[0] {
  const effectiveInteractive = isPromptDisabled ? false : io.interactive;
  if (io.terminal) {
    return { session: io.terminal, interactive: effectiveInteractive };
  }
  if (io.promptIo) {
    const promptIo = io.promptIo;
    return {
      interactive: effectiveInteractive,
      env: io.env,
      openTty: async () => {
        return _toSessionFromPromptIo(promptIo);
      },
    };
  }
  return {
    interactive: effectiveInteractive,
    stdin: io.stdin,
    stdout: _toOutputStream(io.stdout, io.isStdoutTTY),
    stderr: _toOutputStream(io.stderr, io.isStderrTTY),
    env: io.env,
    openTty: io.openTty,
  };
}

function _findDanglingFormatIndex(args: readonly string[]): number {
  if (args[0] !== "coverage") {
    return -1;
  }
  const endOfOptionsIndex = args.indexOf("--");
  const optionSlice =
    endOfOptionsIndex === -1
      ? args.slice(1)
      : args.slice(1, endOfOptionsIndex);
  if (
    optionSlice.includes("--help") ||
    optionSlice.includes("-h") ||
    optionSlice.includes("--no-prompt")
  ) {
    return -1;
  }
  const hasUnknownOption = optionSlice.some((token, index) => {
    if (!token.startsWith("-") || optionSlice[index - 1] === "--format") {
      return false;
    }
    return token !== "--format" && !token.startsWith("--format=");
  });
  if (hasUnknownOption) {
    return -1;
  }
  const relativeIndex = optionSlice.findIndex((token, index) => {
    const nextToken = optionSlice[index + 1];
    return token === "--format" && (!nextToken || nextToken.startsWith("-"));
  });
  return relativeIndex === -1 ? -1 : relativeIndex + 1;
}

async function _resolveMissingFormatArg({
  args,
  io,
}: Readonly<{
  args: readonly string[];
  io: Readonly<CliIo>;
}>): Promise<{ args: readonly string[]; cancelledCode?: number }> {
  const missingIndex = _findDanglingFormatIndex(args);
  if (missingIndex === -1) {
    return { args };
  }
  const session = await openTerminalSession(_buildSessionOptions(io, false));
  if (!session) {
    return { args };
  }
  try {
    const chosen = await Acclimate.requestChoice<Format>({
      message: "Format",
      choices: FORMAT_CHOICES,
      defaultValue: "stylish",
      terminal: session,
      cliName: "avandar-lint coverage",
    });
    return { args: args.toSpliced(missingIndex + 1, 0, chosen) };
  } catch (error) {
    if (error instanceof CLIError && error.code === "prompt_cancelled") {
      Acclimate.printError(error.message, {
        stream: _toOutputStream(io.stderr, io.isStderrTTY),
        env: io.env,
      });
      return { args, cancelledCode: 130 };
    }
    throw error;
  } finally {
    await session.close();
  }
}

function _writeCoverageResult({
  result,
  format,
}: Readonly<{
  result: Awaited<ReturnType<typeof collectCoverage>>;
  format: Format;
}>): void {
  if (format === "json") {
    Acclimate.writeJson(result);
  } else {
    const lines = result.outcomes
      .map((outcome) => {
        return `${outcome.ruleId} ${outcome.language} ${outcome.path} [${outcome.capability}] ${outcome.state}${outcome.recovery ? `: ${outcome.recovery}` : ""}`;
      })
      .join("\n");
    Acclimate.writeData(lines);
  }
  if (result.operational) {
    Acclimate.printSuccess(
      `Coverage complete: ${result.outcomes.length} outcomes.`,
    );
    return;
  }
  const failures = Array.from(
    new Set(
      result.outcomes.flatMap((outcome) => {
        return !outcome.operational && outcome.recovery
          ? [outcome.recovery]
          : [];
      }),
    ),
  );
  const recoveryHint = "Repair the reported engine error and retry coverage.";
  Acclimate.printError(
    `Coverage encountered engine errors: ${result.outcomes.length} outcomes.`,
    failures.length === 0 ? { hint: recoveryHint } : undefined,
  );
  failures.forEach((failure, index) => {
    Acclimate.printError(
      failure,
      index === failures.length - 1 ? { hint: recoveryHint } : undefined,
    );
  });
}

async function _executeCoverage({
  options,
  cwd,
}: Readonly<{
  options: Readonly<CoverageOptions>;
  cwd?: string;
}>): Promise<number> {
  Acclimate.log("|heading|Checking coverage for reviewed paths...|reset|");
  const timer = setInterval(() => {
    Acclimate.log("Still checking coverage...");
  }, 10000);
  try {
    const { loadRuleCatalog } = await import("../catalog/loadRuleCatalog.ts");
    const result = await collectCoverage({
      catalog: loadRuleCatalog(),
      probes: [...createNativeCoverageProbes(), ...createCssCoverageProbes()],
      paths: options.paths,
      cwd,
    });
    _writeCoverageResult({ result, format: options.format });
    return result.operational ? 0 : 1;
  } finally {
    clearInterval(timer);
  }
}

function _createCoverageCli(
  options: Readonly<{
    io: Readonly<CliIo>;
    isBareCoverage: boolean;
    onOperationalExitCode?: (exitCode: number) => void;
  }>,
): AnyCLI {
  return Acclimate.createCLI("coverage")
    .description("Report enforced, not-applicable, or fallback outcomes.")
    .usage(USAGE_SYNOPSIS)
    .addPositionalArg({
      name: "paths",
      type: "string",
      variadic: true,
      required: false,
      defaultValue: ["."],
      description: "File or directory, repeatable. Default: current directory.",
    })
    .addOption({
      name: "--format",
      type: "string",
      required: false,
      choices: FORMATS,
      defaultValue: "stylish",
      description: "Output format. Default: stylish.",
    })
    .addOption({
      name: "--no-prompt",
      type: "boolean",
      required: false,
      defaultValue: false,
      description: "Use defaults without opening the terminal wizard.",
    })
    .addExample(EXAMPLES[0])
    .addExample(EXAMPLES[1])
    .action(async ({ paths, format, noPrompt }) => {
      const parsedFormat =
        FORMATS.find((candidate) => {
          return candidate === format;
        }) ?? "stylish";
      let resolvedOptions: CoverageOptions = {
        paths: paths.length ? paths : ["."],
        format: parsedFormat,
      };
      if (options.isBareCoverage && !noPrompt) {
        const session = await openTerminalSession(
          _buildSessionOptions(options.io, false),
        );
        if (session) {
          resolvedOptions = await runCoverageWizard({
            terminal: session,
            env: options.io.env,
          });
        }
      }
      const exitCode = await _executeCoverage({
        options: resolvedOptions,
        cwd: options.io.cwd,
      });
      options.onOperationalExitCode?.(exitCode);
    });
}

/**
 * Collects coverage paths and output format with visible defaults using
 * Acclimate's controlling-terminal input and choice menu prompts.
 * For example, use it to configure a bare interactive coverage invocation.
 */
export async function runCoverageWizard(
  options: Readonly<WizardOptions> = {},
): Promise<CoverageOptions> {
  const session = await openTerminalSession({
    session:
      options.terminal ??
      (options.promptIo
        ? _toSessionFromPromptIo(options.promptIo)
        : undefined),
    interactive: options.interactive,
    stdin: options.stdin,
    stdout: options.stdout,
    stderr: options.stderr,
    env: options.env,
    openTty: options.openTty,
  });
  const borrowedSession: TerminalSession | undefined = session
    ? {
        ...session,
        close: async () => {},
      }
    : undefined;
  try {
    const rawPaths =
      (await Acclimate.requestInput({
        message: "Paths (comma-separated)",
        params: {},
        responseOptions: {
          required: false,
          type: "string",
          defaultValue: ".",
        },
        terminal: borrowedSession,
        env: options.env,
        interactive: options.interactive,
        cliName: "avandar-lint coverage",
      })) ?? ".";
    const paths = rawPaths
      .split(",")
      .map((path) => {
        return path.trim();
      })
      .filter(Boolean);
    const format = await Acclimate.requestChoice<Format>({
      message: "Format",
      choices: FORMAT_CHOICES,
      defaultValue: "stylish",
      terminal: borrowedSession,
      env: options.env,
      interactive: options.interactive,
      cliName: "avandar-lint coverage",
    });
    return { paths: paths.length ? paths : ["."], format };
  } finally {
    await session?.close();
  }
}

/**
 * Creates the Acclimate CLI tree for `avandar-lint`, wiring `coverage` with
 * variadic paths, format validation, help metadata, and interactive wizard
 * handling for bare terminal invocations.
 */
export function createAvandarLintCli(
  options: Readonly<{
    io?: Readonly<CliIo>;
    isBareCoverage?: boolean;
    onOperationalExitCode?: (exitCode: number) => void;
  }> = {},
): AnyCLI {
  const coverageCli = _createCoverageCli({
    io: options.io ?? {},
    isBareCoverage: options.isBareCoverage ?? false,
    onOperationalExitCode: options.onOperationalExitCode,
  });
  return Acclimate.createCLI("avandar-lint")
    .description(
      "Inspect proven lint coverage for exact files and capabilities.",
    )
    .usage(USAGE_SYNOPSIS)
    .addExample(EXAMPLES[0])
    .addExample(EXAMPLES[1])
    .addCommand("coverage", coverageCli);
}

/**
 * Runs the coverage CLI through Acclimate with separate output and diagnostic
 * streams. For example, use it to execute coverage with injectable IO in an
 * integration test. Returns zero on completion or help, 130 on cancellation,
 * and one on an operational or invocation error.
 */
export async function runCli({
  args,
  io = {},
}: Readonly<{
  args: readonly string[];
  io?: Readonly<CliIo>;
}>): Promise<number> {
  const { args: resolvedArgs, cancelledCode } = await _resolveMissingFormatArg({
    args,
    io,
  });
  if (cancelledCode !== undefined) {
    return cancelledCode;
  }
  const isBareCoverage =
    resolvedArgs.length === 0 ||
    (resolvedArgs.length === 1 && resolvedArgs[0] === "coverage");
  let operationalExitCode = 0;
  const cli = createAvandarLintCli({
    io,
    isBareCoverage,
    onOperationalExitCode: (code) => {
      operationalExitCode = code;
    },
  });
  const acclimateExitCode = await Acclimate.execute(cli, {
    args: resolvedArgs,
    stdin: io.stdin,
    stdout: _toOutputStream(io.stdout, io.isStdoutTTY),
    stderr: _toOutputStream(io.stderr, io.isStderrTTY),
    env: io.env,
    isStdoutTTY: io.isStdoutTTY ?? (io.stdout ? false : undefined),
    isStderrTTY: io.isStderrTTY ?? (io.stderr ? false : undefined),
    terminal: io.terminal,
    promptIo: io.promptIo,
    interactive: io.interactive,
    openTty: io.openTty,
  });
  return acclimateExitCode !== 0 ? acclimateExitCode : operationalExitCode;
}

if (import.meta.main) {
  process.exitCode = await runCli({ args: process.argv.slice(2) });
}
