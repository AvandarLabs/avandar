import { getPipelineServerClientConfig } from "@ava-cli/PipelineCli/getPipelineServerClientConfig";
import { PipelineRunFailedError } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunFailedError";
import { readPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/readPipelineRunReport";
import type { ReceivedPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";
import { Agent } from "undici";

/** HTTP status the server answers for invalid run options. */
const _BAD_REQUEST_STATUS = 400;

/**
 * How long the CLI waits for a run's response headers, and then between
 * body chunks. The server answers only once the run ends, and a full run can
 * take many minutes, past `fetch`'s default 300 s headers timeout. Two hours
 * still bounds a request to a server that died without closing the
 * connection.
 */
const _RUN_RESPONSE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/** What an error response says: its message, and a report if it sent one. */
type _ErrorBody = Readonly<{
  message: string;
  report: ReceivedPipelineRunReport | undefined;
}>;

/** The parsed JSON of an error body, or `undefined` if it is not JSON. */
function _parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The `error` string of a JSON error body, or `undefined` if it has none. */
function _readJsonErrorMessage(json: unknown): string | undefined {
  if (typeof json !== "object" || json === null || !("error" in json)) {
    return undefined;
  }
  return typeof json.error === "string" ? json.error : undefined;
}

/**
 * The run report of a JSON error body, sent when every drive failed, or
 * `undefined` if it has none.
 */
function _readJsonErrorReport(
  json: unknown,
): ReceivedPipelineRunReport | undefined {
  if (typeof json !== "object" || json === null || !("report" in json)) {
    return undefined;
  }
  return readPipelineRunReport(json.report);
}

/**
 * The most useful message in an error response: the JSON `error` string if
 * there is one, otherwise the body text if it is non-empty, otherwise the
 * status line. Also the run report, when the body carries one. The body is
 * read once, since a stream cannot be read twice.
 */
async function _readErrorBody(res: Response): Promise<_ErrorBody> {
  let text: string;
  try {
    text = (await res.text()).trim();
  } catch {
    return { message: `HTTP ${res.status}`, report: undefined };
  }
  const json: unknown = _parseJson(text);
  const fallback: string = text === "" ? `HTTP ${res.status}` : text;
  return {
    message: _readJsonErrorMessage(json) ?? fallback,
    report: _readJsonErrorReport(json),
  };
}

/**
 * Throws for an unsuccessful response: the server's own message for a 400,
 * and the status line plus that message otherwise. A response that carries
 * a run report throws `PipelineRunFailedError` with it.
 */
async function _throwResponseError(res: Response): Promise<never> {
  const { message, report } = await _readErrorBody(res);
  if (res.status === _BAD_REQUEST_STATUS) {
    throw new Error(message);
  }
  const statusMessage = `${res.status} ${res.statusText}: ${message}`;
  if (report !== undefined) {
    throw new PipelineRunFailedError({ message: statusMessage, report });
  }
  throw new Error(statusMessage);
}

/**
 * The JSON body for the given options, or `undefined` when there are none.
 * Only the keys the server accepts are sent: it rejects any other key.
 */
function _buildRunBody(
  runOptions: PipelineRunRequestOptions,
): Record<string, unknown> | undefined {
  const body = {
    ...(runOptions.incremental === true ? { incremental: true } : {}),
    ...(runOptions.since === undefined ? {} : { since: runOptions.since }),
    ...(runOptions.until === undefined ? {} : { until: runOptions.until }),
    ...(runOptions.limit === undefined ? {} : { limit: runOptions.limit }),
    ...(runOptions.scopes === undefined ? {} : { scopes: runOptions.scopes }),
  };
  return Object.keys(body).length === 0 ? undefined : body;
}

/** The error code under a failed `fetch`, such as `ECONNREFUSED`. */
function _getFetchErrorCode(error: unknown): string | undefined {
  const cause: unknown =
    error instanceof Error && "cause" in error
      ? (error as Error & { cause?: unknown }).cause
      : undefined;
  return cause !== null &&
    typeof cause === "object" &&
    "code" in cause &&
    typeof (cause as { code: unknown }).code === "string"
    ? (cause as { code: string }).code
    : undefined;
}

/**
 * Posts the run request. A refused connection throws a message that says
 * how to start the server or run locally instead.
 */
async function _postRunRequest(
  args: Readonly<{
    url: string;
    baseURL: string;
    serverSecret: string;
    body: Record<string, unknown> | undefined;
    dispatcher: Agent;
  }>,
): Promise<Response> {
  const { body } = args;
  try {
    return await fetch(args.url, {
      method: "POST",
      // The global `fetch` types come from the older `undici-types` that
      // `@types/node` pins, so they do not match this `undici` Agent's types.
      // At runtime Node's bundled undici accepts it.
      dispatcher: args.dispatcher as unknown as RequestInit["dispatcher"],
      headers: {
        authorization: `Bearer ${args.serverSecret}`,
        // Fastify rejects an empty body sent as JSON, so a body is only sent
        // when there is an option to carry.
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error: unknown) {
    if (_getFetchErrorCode(error) === "ECONNREFUSED") {
      throw new Error(
        `Cannot reach pipeline server at ${args.baseURL}. Start it with ` +
          "`pnpm dev:pipeline-server` from the repo root, or run without a " +
          "server: `ava pipeline run <name> --local`.",
      );
    }
    throw error;
  }
}

/**
 * Asks the pipeline server to run a pipeline.
 *
 * @returns The run's report, as received.
 * @throws With the server's own message when it rejects the options (400),
 * and with the status line plus that message for any other failure.
 * @throws PipelineRunFailedError, carrying the report, when every drive
 * failed.
 */
export async function sendRunPipelineRequest(options: {
  pipelineName: string;
  runOptions: PipelineRunRequestOptions;
}): Promise<ReceivedPipelineRunReport> {
  const config = getPipelineServerClientConfig();
  const encodedPipelineName: string = encodeURIComponent(options.pipelineName);
  const url: string = `${config.baseURL}/${encodedPipelineName}/run`;
  const body = _buildRunBody(options.runOptions);
  const dispatcher = new Agent({
    headersTimeout: _RUN_RESPONSE_TIMEOUT_MS,
    bodyTimeout: _RUN_RESPONSE_TIMEOUT_MS,
  });
  try {
    const res: Response = await _postRunRequest({
      url,
      baseURL: config.baseURL,
      serverSecret: config.serverSecret,
      body,
      dispatcher,
    });
    if (!res.ok) {
      await _throwResponseError(res);
    }
    return readPipelineRunReport(await res.json());
  } finally {
    await dispatcher.close();
  }
}
