/**
 * Terminal output for the crosswalk measurement scripts: progress,
 * results, and errors go to stderr, so stdout holds only a script's
 * documented result. Plain text when stderr is not a terminal, `NO_COLOR`
 * is set, or `TERM` is `dumb`.
 */
const IS_PLAIN =
  !process.stderr.isTTY ||
  Boolean(process.env.NO_COLOR) ||
  process.env.TERM === "dumb";

const THEME = {
  accent: "36",
  success: "32",
  warning: "33",
  error: "31",
  heading: "1",
} as const;

function _paint(role: keyof typeof THEME, text: string): string {
  return IS_PLAIN ? text : `\u001b[${THEME[role]}m${text}\u001b[0m`;
}

function _write(line: string): void {
  process.stderr.write(`${line}\n`);
}

/** Prints the measurement scripts' progress, results, and errors. */
export const MeasurementOutput = {
  /** Announces work before it starts. */
  step: (message: string): void => {
    _write(`${_paint("accent", "→")} ${message}`);
  },
  success: (message: string): void => {
    _write(_paint("success", `✅ ${message}`));
  },
  warn: (message: string): void => {
    _write(_paint("warning", `⚠️ ${message}`));
  },
  /** Prints an error and how to recover, and marks the run as failed. */
  fail: (
    options: Readonly<{ script: string; message: string; hint: string }>,
  ): void => {
    _write(_paint("error", `❌ ${options.script}: ${options.message}`));
    _write(_paint("warning", `  ⚠️ ${options.hint}`));
    process.exitCode = 1;
  },
};

/**
 * Handles a script's arguments: `-h` or `--help` prints `help` to stdout;
 * anything else prints the usage and a hint to stderr and fails, since the
 * measurement scripts take no options. Returns true when the script should
 * run. A `--` from `pnpm vite-script` is ignored.
 */
export function shouldRunScript(
  options: Readonly<{ script: string; argv: readonly string[]; help: string }>,
): boolean {
  const args = options.argv.filter((arg) => {
    return arg !== "--";
  });
  if (args.includes("-h") || args.includes("--help")) {
    process.stdout.write(`${options.help}\n`);
    return false;
  }
  if (args.length > 0) {
    process.stderr.write(`${options.help}\n\n`);
    MeasurementOutput.fail({
      script: options.script,
      message: `Unknown arguments: ${args.join(" ")}`,
      hint: "This script takes no options. Run it with none, or with --help.",
    });
    return false;
  }
  return true;
}
