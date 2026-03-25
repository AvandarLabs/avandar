export type PipelineServerClientConfig = Readonly<{
  baseURL: string;
  serverSecret: string;
}>;

function _normalizeBaseURL(rawBaseURL: string): string {
  const parsed = new URL(rawBaseURL);

  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  parsed.search = "";
  parsed.hash = "";

  return parsed.toString().replace(/\/+$/, "");
}

function _getBaseURL(): string {
  const url = (process.env.AVA_PIPELINE_SERVER_URL ?? "").trim();

  if (!url) {
    throw new Error("AVA_PIPELINE_SERVER_URL is not set in .env.development");
  }

  return _normalizeBaseURL(url);
}

function _getServerSecret(): string {
  const secret = (process.env.AVA_PIPELINE_SERVER_SECRET ?? "").trim();

  if (!secret) {
    throw new Error(
      "AVA_PIPELINE_SERVER_SECRET is not set in .env.development",
    );
  }

  return secret;
}

export function getPipelineServerClientConfig(): PipelineServerClientConfig {
  return {
    baseURL: _getBaseURL(),
    serverSecret: _getServerSecret(),
  };
}
