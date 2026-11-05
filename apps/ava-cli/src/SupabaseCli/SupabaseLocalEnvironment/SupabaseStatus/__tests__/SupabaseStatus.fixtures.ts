import { propEq } from "@avandar/utils";
import type {
  SupabaseBackupManifest,
  SupabaseStatusEntry,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** Config, status, manifest, and env inputs shared by the status suites. */

export const STANDARD_CONFIG = `project_id = "avandar"

[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323

[inbucket]
port = 51634
`;

export const SWITCHED_CONFIG = STANDARD_CONFIG.replace(
  '"avandar"',
  '"analytics-p2-temp"',
).replace("port = 54321", "port = 55321");

export const STATUS_JSON = JSON.stringify({
  API_URL: "http://127.0.0.1:55321",
  DB_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  ANON_KEY: "anon",
  SERVICE_ROLE_KEY: "service",
  PUBLISHABLE_KEY: "publishable",
  SECRET_KEY: "secret",
  STUDIO_URL: "http://127.0.0.1:55323",
  MAILPIT_URL: "http://127.0.0.1:52634",
  FUNCTIONS_URL: "http://127.0.0.1:55321/functions/v1",
  STORAGE_S3_URL: "http://127.0.0.1:55321/storage/v1/s3",
  GRAPHQL_URL: "http://127.0.0.1:55321/graphql/v1",
  JWT_SECRET: "super-secret",
});

export const MANIFEST: SupabaseBackupManifest = {
  kind: "local",
  branch: "feat/analytics-p2",
  worktreePath: "/repo",
  temporaryProjectId: "analytics-p2-temp",
  basePort: 55321,
  derivedPorts: { "api.port": 55321 },
  files: [
    { sourcePath: "/repo/supabase/config.toml", backupPath: "/backup/a" },
  ],
  state: "active",
};

export function getValueFromEntries(
  options: Readonly<{
    entries: readonly SupabaseStatusEntry[];
    label: string;
  }>,
): string | undefined {
  return options.entries.find(propEq("label", options.label))?.value;
}

export const REMOTE_MANIFEST: SupabaseBackupManifest = {
  kind: "remote",
  branch: "feat/analytics-p2",
  worktreePath: "/repo",
  remoteProjectId: "abcdefghijklmnopqrst",
  remoteApiUrl: "https://abcdefghijklmnopqrst.supabase.co",
  files: [{ sourcePath: "/repo/.env.development", backupPath: "/backup/a" }],
  state: "active",
};

/** `.env.development` as a remote switch leaves it. */
export const REMOTE_ENV_FILE = {
  filePath: "/repo/.env.development",
  contents: [
    "VITE_SUPABASE_API_URL=https://abcdefghijklmnopqrst.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY=sb_secret_remote_0123456789",
    "AVA_SUPABASE_REMOTE_PROJECT_ID=abcdefghijklmnopqrst",
    "",
  ].join("\n"),
};

/** `.env.development` as a switch to `analytics-p2-temp` leaves it. */
export const SWITCHED_ENV_FILE = {
  filePath: "/repo/.env.development",
  contents: "SUPABASE_PROJECT_ID=analytics-p2-temp\nSUPABASE_API_PORT=55321\n",
};
