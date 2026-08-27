import { requireEnv } from "@ava-cli/avaEnv/avaEnv";

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

export function getPipelineServerClientConfig(): PipelineServerClientConfig {
  return {
    baseURL: _normalizeBaseURL(requireEnv("AVA_PIPELINE_SERVER_URL")),
    serverSecret: requireEnv("AVA_PIPELINE_SERVER_SECRET"),
  };
}
