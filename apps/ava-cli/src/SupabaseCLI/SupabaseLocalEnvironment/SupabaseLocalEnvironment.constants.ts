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
