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
  const url = (process.env.AVA_DEV_FANOUT_SERVER_URL ?? "").trim();
  if (!url) {
    throw new Error("AVA_DEV_FANOUT_SERVER_URL is not set in .env.development");
  }

  return _normalizeBaseURL(url);
}

function _getAdminSecret(): string {
  const secret = (process.env.AVA_DEV_FANOUT_ADMIN_SERVER_SECRET ?? "").trim();
  if (!secret) {
    throw new Error(
      "AVA_DEV_FANOUT_ADMIN_SERVER_SECRET is not set in .env.development",
    );
  }
  return secret;
}

/**
 * Create an authenticated client config for the dev-fanout-server.
 *
 * Loads `.env.development` to read `AVA_DEV_FANOUT_SERVER_URL` and
 * `AVA_DEV_FANOUT_ADMIN_SERVER_SECRET`.
 */
export function getDevFanoutServerClientConfig(): DevFanoutClientConfig {
  return {
    baseURL: _getBaseURL(),
    adminToken: _getAdminSecret(),
  };
}
