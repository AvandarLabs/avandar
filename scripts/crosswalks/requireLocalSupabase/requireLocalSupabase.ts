/** Hostnames of this machine. `URL` keeps the brackets on an IPv6 host. */
const LOOPBACK_HOSTNAMES: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);

function _isLoopbackUrl(url: string): boolean {
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Why a measurement script must not run against this environment, or
 * undefined when it points only at a Supabase on this machine. Checked
 * before any key is read or any client is made, so a hosted project can
 * never be written to.
 */
export function getRemoteSupabaseRefusal(
  env: Readonly<Record<string, string | undefined>>,
): string | undefined {
  if (env.AVA_SUPABASE_REMOTE_PROJECT_ID) {
    return `This worktree is switched to the hosted Supabase project ${env.AVA_SUPABASE_REMOTE_PROJECT_ID}.`;
  }
  const serverUrl = env.SUPABASE_URL;
  if (!serverUrl) {
    return "SUPABASE_URL is not set.";
  }
  if (!_isLoopbackUrl(serverUrl)) {
    return `SUPABASE_URL (${serverUrl}) is not a Supabase on this machine.`;
  }
  const browserUrl = env.VITE_SUPABASE_API_URL;
  if (browserUrl !== undefined && !_isLoopbackUrl(browserUrl)) {
    return `VITE_SUPABASE_API_URL (${browserUrl}) is not a Supabase on this machine.`;
  }
  return undefined;
}
