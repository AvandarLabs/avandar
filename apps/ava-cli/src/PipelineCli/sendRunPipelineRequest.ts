import { getPipelineServerClientConfig } from "@ava-cli/PipelineCli/getPipelineServerClientConfig";
import { PipelineRunFailedError } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunFailedError";
import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { PipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";

/** HTTP status the server answers for invalid run options. */
const _BAD_REQUEST_STATUS = 400;

/** What an error response says: its message, and a report if it sent one. */
type _ErrorBody = Readonly<{
  message: string;
  report: PipelineRunReport | undefined;
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
function _readJsonErrorReport(json: unknown): PipelineRunReport | undefined {
  if (typeof json !== "object" || json === null || !("report" in json)) {
    return undefined;
  }
  const result = PipelineRunReportSchema.safeParse(json.report);
  return result.success ? result.data : undefined;
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
  };
  return Object.keys(body).length === 0 ? undefined : body;
}

/**
 * Asks the pipeline server to run a pipeline.
 *
 * @returns The run's report.
 * @throws With the server's own message when it rejects the options (400),
 * and with the status line plus that message for any other failure.
 * @throws PipelineRunFailedError, carrying the report, when every drive
 * failed.
 */
export async function sendRunPipelineRequest(options: {
  pipelineName: string;
  runOptions: PipelineRunRequestOptions;
}): Promise<PipelineRunReport> {
  const config = getPipelineServerClientConfig();
  const encodedPipelineName: string = encodeURIComponent(options.pipelineName);
  const url: string = `${config.baseURL}/${encodedPipelineName}/run`;
  const body = _buildRunBody(options.runOptions);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.serverSecret}`,
        // Fastify rejects an empty body sent as JSON, so a body is only sent
        // when there is an option to carry.
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error: unknown) {
    const cause: unknown =
      error instanceof Error && "cause" in error
        ? (error as Error & { cause?: unknown }).cause
        : undefined;
    const code: unknown =
      cause !== null &&
      typeof cause === "object" &&
      "code" in cause &&
      typeof (cause as { code: unknown }).code === "string"
        ? (cause as { code: string }).code
        : undefined;

    if (code === "ECONNREFUSED") {
      throw new Error(
        `Cannot reach pipeline server at ${config.baseURL}. Start it with ` +
          "`pnpm dev:pipeline-server` from the repo root, or run without a " +
          "server: `ava pipeline run <name> --local`.",
      );
    }

    throw error;
  }

  if (!res.ok) {
    await _throwResponseError(res);
  }

  return PipelineRunReportSchema.parse(await res.json());
}
