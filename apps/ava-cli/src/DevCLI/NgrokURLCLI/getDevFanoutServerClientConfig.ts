import { requireEnv } from "@ava-cli/avaEnv/avaEnv";

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

function _getBaseURL(): string {
  return _normalizeBaseURL(requireEnv("AVA_DEV_FANOUT_SERVER_URL"));
}

/**
 * Create an authenticated client config for the dev-fanout-server.
 *
 * Reads `AVA_DEV_FANOUT_SERVER_URL` and `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET`
 * from whichever env file this invocation loaded.
 */
export function getDevFanoutServerClientConfig(): DevFanoutClientConfig {
  return {
    baseURL: _getBaseURL(),
    adminToken: requireEnv("AVA_DEV_FANOUT_ADMIN_SERVER_SECRET"),
  };
}
