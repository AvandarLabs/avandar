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
  const res: Response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serverSecret}`,
    },
  });

  if (!res.ok) {
    const message: string = await _readErrorBody(res);
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  return await res.text();
}
