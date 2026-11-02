import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";

export type DevFanoutClientConfig = Readonly<{
  baseURL: string;
  adminToken: string;
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

/**
 * Create an authenticated client config for the dev-fanout-server.
 *
 * Reads `AVA_DEV_FANOUT_SERVER_URL` and `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET`
 * from whichever env file this invocation loaded.
 */
export function getDevFanoutServerClientConfig(): DevFanoutClientConfig {
  return {
    baseURL: _normalizeBaseURL(AvaEnv.requireVar("AVA_DEV_FANOUT_SERVER_URL")),
    adminToken: AvaEnv.requireVar("AVA_DEV_FANOUT_ADMIN_SERVER_SECRET"),
  };
}
