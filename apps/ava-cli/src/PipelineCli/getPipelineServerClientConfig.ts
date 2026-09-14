import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";

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
    baseURL: _normalizeBaseURL(AvaEnv.requireVar("AVA_PIPELINE_SERVER_URL")),
    serverSecret: AvaEnv.requireVar("AVA_PIPELINE_SERVER_SECRET"),
  };
}
