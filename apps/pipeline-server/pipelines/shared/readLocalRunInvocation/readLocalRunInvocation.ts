import type { ExecutionInvocation } from "@avandar/etl";

/** The variable the `ava` CLI passes a local run's invocation in, as JSON. */
export const LOCAL_RUN_INVOCATION_ENV = "AVA_PIPELINE_INVOCATION";

function _readOptionalString(
  record: Record<string, unknown>,
  key: string,
): Readonly<Record<string, string>> {
  const value = record[key];
  return typeof value === "string" ? { [key]: value } : {};
}

/**
 * How a local run was started. The `ava` CLI passes its argv, actor, host,
 * and commit as JSON in `AVA_PIPELINE_INVOCATION`. Without a readable value,
 * such as when `scripts/runPipelineOnce.ts` is run by hand, the script's own
 * argv and host are recorded instead.
 *
 * @param args.environmentValue - `AVA_PIPELINE_INVOCATION`, if set.
 * @param args.fallbackArgv - The script's own argv.
 * @param args.fallbackHost - This machine's hostname.
 */
export function readLocalRunInvocation(args: {
  environmentValue: string | undefined;
  fallbackArgv: readonly string[];
  fallbackHost: string;
}): ExecutionInvocation {
  const fallback: ExecutionInvocation = {
    invokedVia: "cli_local",
    cliArgv: args.fallbackArgv,
    host: args.fallbackHost,
  };
  if (args.environmentValue === undefined) {
    return fallback;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.environmentValue);
  } catch {
    return fallback;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return fallback;
  }
  const record = parsed as Record<string, unknown>;
  const { cliArgv } = record;
  const isArgvList =
    Array.isArray(cliArgv) &&
    cliArgv.every((entry) => {
      return typeof entry === "string";
    });
  return {
    invokedVia: "cli_local",
    cliArgv: isArgvList ? (cliArgv as string[]) : args.fallbackArgv,
    ..._readOptionalString(record, "actor"),
    host: typeof record.host === "string" ? record.host : args.fallbackHost,
    ..._readOptionalString(record, "codeVersion"),
  };
}
