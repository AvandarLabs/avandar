/** Docker resource dependency order for local Supabase cleanup. */
export const SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER = [
  "container",
  "network",
  "volume",
] as const;

/** File name of the manifest stored at the root of every backup directory. */
export const MANIFEST_FILE = "manifest.json";

/** Supabase project ids allowed for a temporary branch-scoped project. */
export const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** Durable states stored in a local Supabase backup manifest. */
export const SUPABASE_BACKUP_STATES = ["switching", "active"] as const;

/**
 * The branch whose worktree belongs on the shared local Supabase.
 *
 * Every other branch is expected to switch, so which state counts as healthy
 * flips here: a switched `develop` is the surprise, and an unswitched feature
 * branch is the one writing to a database its neighbours share.
 */
export const SHARED_STACK_BRANCH = "develop";

/** Lowest port a local service may bind. */
export const MIN_TCP_PORT = 1;

/** Highest port a local service may bind. */
export const MAX_TCP_PORT = 65_535;

/** Vite dev-server port used by a worktree that has not been switched. */
export const DEFAULT_DEV_SERVER_PORT = 5173;

/** Environment variable that pins a worktree's Vite dev-server port. */
export const DEV_SERVER_PORT_ENV_KEY = "AVA_VITE_DEV_PORT";

/** Environment variable holding the absolute URL the app is served from. */
export const APP_URL_ENV_KEY = "VITE_APP_URL";

/**
 * Host names that mean "this machine", and whose port therefore belongs to the
 * worktree rather than to a remote service.
 */
export const LOOPBACK_HOST_NAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);
