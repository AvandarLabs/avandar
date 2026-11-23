import type { CaptureOptions } from "./captureAvandar.types";
/** Capture command-line flags and the option each value sets. */
const FLAG_OPTIONS: Readonly<Record<string, keyof CaptureOptions>> = {
  "--base-url": "baseUrl",
  "--workspace": "workspace",
  "--run-label": "runLabel",
  "--fixture-dir": "fixtureDir",
  "--root": "root",
};
/** The value after a flag, refusing a missing one or another flag. */
function _readFlagValue({
  args,
  index,
}: Readonly<{
  args: readonly string[];
  index: number;
}>): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${args[index]}`);
  }
  return value;
}
/**
 * Parses the `pnpm capture` command line into capture options plus the
 * `--help` and `--list` switches. Throws on an unknown or incomplete flag.
 */
export function parseCaptureArgs({
  args,
  index = 0,
}: Readonly<{
  args: readonly string[];
  index?: number;
}>): CaptureOptions & {
  help?: boolean;
  list?: boolean;
} {
  const arg = args[index];
  if (arg === undefined) {
    return {};
  }
  if (arg === "--help" || arg === "--list") {
    return {
      ...parseCaptureArgs({
        args,
        index: index + 1,
      }),
      [arg.slice(2)]: true,
    };
  }
  if (arg === "--flows" || FLAG_OPTIONS[arg]) {
    const value = _readFlagValue({
      args,
      index,
    });
    const remainingOptions = parseCaptureArgs({
      args,
      index: index + 2,
    });
    return arg === "--flows"
      ? { flowIds: value.split(","), ...remainingOptions }
      : { [FLAG_OPTIONS[arg]]: value, ...remainingOptions };
  }
  throw new Error(`Unknown capture argument: ${arg}`);
}
