import { parseArgs } from "node:util";
import type { RawPipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";

/** The flags a run accepts. Values stay strings until they are parsed. */
const RUN_OPTION_FLAGS = {
  incremental: { type: "boolean" },
  since: { type: "string" },
  until: { type: "string" },
  limit: { type: "string" },
} as const;

/**
 * Reads `--incremental`, `--since`, `--until`, and `--limit` from argv,
 * unvalidated. Accepts both `--limit 5` and `--limit=5`.
 *
 * @throws For an unknown flag (such as a misspelled `--incremental`), a flag
 * missing its value, a flag given more than once, or a positional argument,
 * so a typo never silently becomes a full run.
 */
export function readRawPipelineRunOptionsFromArgv(
  args: readonly string[],
): RawPipelineRunOptions {
  const { values, tokens } = parseArgs({
    args: [...args],
    options: RUN_OPTION_FLAGS,
    strict: true,
    allowPositionals: false,
    tokens: true,
  });
  const seenFlags = new Set<string>();
  tokens.forEach((token) => {
    if (token.kind !== "option") {
      return;
    }
    if (seenFlags.has(token.name)) {
      throw new Error(
        `Got --${token.name} more than once. Pass each flag once.`,
      );
    }
    seenFlags.add(token.name);
  });
  return {
    ...(values.incremental === true ? { incremental: true } : {}),
    ...(values.since === undefined ? {} : { since: values.since }),
    ...(values.until === undefined ? {} : { until: values.until }),
    ...(values.limit === undefined ? {} : { limit: values.limit }),
  };
}
