import { spawn } from "node:child_process";
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/** Hosts that mean "the Supabase stack running on this machine". */
const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);

/**
 * Reads the local database URL from the loaded env file, refusing anything
 * that could reach a deployed database.
 *
 * Both checks are needed: `--staging` and `--prod` select a deployed env file,
 * and `.env.development` itself could name a remote host.
 */
function _getLocalDatabaseUrl(): string {
  const target = AvaEnv.getLoadedEnvTarget();
  if (target !== "local") {
    throw new Error(
      `ava supabase sql only runs against the local database, not ${target}.`,
    );
  }
  const databaseUrl = AvaEnv.requireVar("SUPABASE_POSTGRES_URL");
  const { hostname } = new URL(databaseUrl);
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `SUPABASE_POSTGRES_URL points at ${hostname}, which is not a local ` +
        "database. ava supabase sql only runs against the local database.",
    );
  }
  return databaseUrl;
}

/** Runs psql in this terminal, resolving to its exit code. */
function _runPsql(args: readonly string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [...args], { stdio: "inherit" });
    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "ENOENT"
          ? new Error(
              "psql is not installed or not on PATH. Install it with " +
                "`brew install libpq` and follow its PATH instructions.",
            )
          : error,
      );
    });
    child.on("close", (exitCode: number | null) => {
      resolve(exitCode ?? 1);
    });
  });
}

/**
 * Runs SQL against the local Supabase database with psql, or opens a psql
 * shell when there is no SQL. The database is whichever one
 * `SUPABASE_POSTGRES_URL` names, which `ava supabase switch` and
 * `ava supabase restore` keep pointed at this worktree's stack.
 *
 * @param options.sql - The SQL to run with `psql -c`, or `undefined` for a
 * shell.
 */
export async function runSupabaseSql(options: {
  sql: string | undefined;
}): Promise<void> {
  const sql = options.sql?.trim();
  try {
    const databaseUrl = _getLocalDatabaseUrl();
    const exitCode = await _runPsql(
      sql ? [databaseUrl, "-c", sql] : [databaseUrl],
    );
    // psql has already printed why it failed, so its exit code is passed on
    // rather than thrown: a thrown error would add a stack trace after it.
    process.exitCode = exitCode;
  } catch (error: unknown) {
    printError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/** Run SQL against the local Supabase database, or open a psql shell. */
export const SupabaseSqlCli = Acclimate.createCLI("sql")
  .description(
    "Run SQL against the local Supabase database with psql, or open a psql " +
      "shell when no SQL is given. Follows ava supabase switch. Refuses " +
      "--staging and --prod.",
  )
  .addPositionalArg({
    name: "sql",
    required: false,
    description: 'The SQL to run, in quotes, e.g. "select 1".',
    type: "string",
  })
  .action(({ sql }: Readonly<{ sql?: string }>) => {
    return runSupabaseSql({ sql });
  });
