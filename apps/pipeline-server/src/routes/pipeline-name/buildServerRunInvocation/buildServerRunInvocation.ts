import type { ExecutionInvocation } from "@avandar/etl";

/** The header the `ava` CLI sends its invocation in, as JSON. */
export const INVOCATION_HEADER = "x-ava-invocation";

type _CliInvocationHeader = Readonly<{
  cliArgv: readonly string[];
  actor: string | undefined;
}>;

function _isStringList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => {
      return typeof entry === "string";
    })
  );
}

/**
 * Reads the CLI's invocation header: its argv and actor. Any other field,
 * such as the CLI's own commit, is ignored, since `code_version` records the
 * code that executed the run.
 */
function _readCliInvocationHeader(
  header: unknown,
): _CliInvocationHeader | undefined {
  if (typeof header !== "string") {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(header);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const { cliArgv, actor } = parsed as Record<string, unknown>;
  if (!_isStringList(cliArgv)) {
    return undefined;
  }
  return { cliArgv, actor: typeof actor === "string" ? actor : undefined };
}

/**
 * How a server run was started: `cli_server` with the CLI's argv and actor
 * when the request carries a valid `X-Ava-Invocation` header, otherwise
 * `http`. Both record the body the server received, the server's host, and
 * its commit. Authorization is never recorded.
 *
 * @param args.invocationHeader - The `X-Ava-Invocation` header, if sent.
 * @param args.requestBody - The body as received (`{}` when none was sent).
 * @param args.host - The server's hostname.
 * @param args.codeVersion - The server's commit, from `AVA_CODE_VERSION`.
 */
export function buildServerRunInvocation(args: {
  invocationHeader: unknown;
  requestBody: unknown;
  host: string;
  codeVersion: string | undefined;
}): ExecutionInvocation {
  const cli = _readCliInvocationHeader(args.invocationHeader);
  return {
    invokedVia: cli === undefined ? "http" : "cli_server",
    ...(cli === undefined ? {} : { cliArgv: cli.cliArgv }),
    ...(cli?.actor === undefined ? {} : { actor: cli.actor }),
    requestBody: args.requestBody,
    host: args.host,
    ...(args.codeVersion === undefined
      ? {}
      : { codeVersion: args.codeVersion }),
  };
}
