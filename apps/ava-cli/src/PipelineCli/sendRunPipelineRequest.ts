import { getPipelineServerClientConfig } from "@ava-cli/PipelineCli/getPipelineServerClientConfig";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";

/** HTTP status the server answers for invalid run options. */
const _BAD_REQUEST_STATUS = 400;

async function _readErrorBody(res: Response): Promise<string> {
  try {
    const json: unknown = await res.json();

    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "string"
    ) {
      return (json as { error: string }).error;
    }

    return JSON.stringify(json);
  } catch {
    try {
      return await res.text();
    } catch {
      return `HTTP ${res.status}`;
    }
  }
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
 * @throws With the server's own message when it rejects the options (400),
 * and with the status line plus that message for any other failure.
 */
export async function sendRunPipelineRequest(options: {
  pipelineName: string;
  runOptions: PipelineRunRequestOptions;
}): Promise<string> {
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
    const message: string = await _readErrorBody(res);
    if (res.status === _BAD_REQUEST_STATUS) {
      throw new Error(message);
    }
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  return await res.text();
}
