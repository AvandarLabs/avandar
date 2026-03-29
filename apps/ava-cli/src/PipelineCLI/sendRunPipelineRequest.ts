import { getPipelineServerClientConfig } from "@ava-cli/PipelineCLI/getPipelineServerClientConfig";

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

export async function sendRunPipelineRequest(options: {
  pipelineName: string;
}): Promise<string> {
  const config = getPipelineServerClientConfig();
  const encodedPipelineName: string = encodeURIComponent(options.pipelineName);
  const url: string = `${config.baseURL}/${encodedPipelineName}/run`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.serverSecret}`,
      },
    });
  } catch (error: unknown) {
    const cause: unknown =
      error instanceof Error && "cause" in error ?
        (error as Error & { cause?: unknown }).cause
      : undefined;
    const code: unknown =
      (
        cause !== null &&
        typeof cause === "object" &&
        "code" in cause &&
        typeof (cause as { code: unknown }).code === "string"
      ) ?
        (cause as { code: string }).code
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
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  return await res.text();
}
