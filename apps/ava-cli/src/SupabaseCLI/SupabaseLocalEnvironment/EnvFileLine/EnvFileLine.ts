import { LOOPBACK_HOST_NAMES } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";

/** The key and value a development env file line assigns. */
export type EnvAssignment = {
  key: string;
  value: string;
};

function _getAssignment(line: string): EnvAssignment | undefined {
  const separatorIndex = line.indexOf("=");
  return separatorIndex < 1 ? undefined : (
      {
        key: line.slice(0, separatorIndex),
        value: line.slice(separatorIndex + 1).trim(),
      }
    );
}

function _getQuote(value: string): string {
  const quote = value.slice(0, 1);
  return (
      value.length >= 2 &&
        (quote === '"' || quote === "'") &&
        value.endsWith(quote)
    ) ?
      quote
    : "";
}

function _getUnquotedValue(value: string): string {
  return _getQuote(value) === "" ? value : value.slice(1, -1);
}

function _getLoopbackUrl(value: string): URL | undefined {
  try {
    const url = new URL(_getUnquotedValue(value));
    return LOOPBACK_HOST_NAMES.has(url.hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Reads the parts of one `KEY=value` line of a development env file. */
export const EnvFileLine = {
  /**
   * Splits a line into its key and trimmed value.
   *
   * Returns undefined for a line that assigns nothing, which covers blank
   * lines, comments, and a stray leading `=` with no key in front of it.
   */
  getAssignment: _getAssignment,

  /** The quote character wrapping a value, or "" when it is unquoted. */
  getQuote: _getQuote,

  /** Strips a matching pair of surrounding quotes from a value. */
  getUnquotedValue: _getUnquotedValue,

  /**
   * Parses a value into a URL, or undefined unless it names this machine.
   *
   * A quoted value parses the same as a bare one, and a URL served by a remote
   * host returns undefined: only a loopback port belongs to this worktree.
   */
  getLoopbackUrl: _getLoopbackUrl,
};
