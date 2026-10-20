import type { RawPipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";

function _readFlagValue(
  args: readonly string[],
  flag: string,
): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : (args[index + 1] ?? "");
}

/**
 * Reads `--incremental`, `--since`, `--until`, and `--limit` from argv,
 * unvalidated. A flag given with no value reads as an empty string, so
 * `parsePipelineRunOptions` rejects it instead of ignoring it.
 */
export function readRawPipelineRunOptionsFromArgv(
  args: readonly string[],
): RawPipelineRunOptions {
  const since = _readFlagValue(args, "--since");
  const until = _readFlagValue(args, "--until");
  const limit = _readFlagValue(args, "--limit");
  return {
    ...(args.includes("--incremental") ? { incremental: true } : {}),
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
    ...(limit === undefined ? {} : { limit }),
  };
}
