/**
 * Runs SQL against the local Supabase database.
 *
 * WHY SQL GOES IN ON STDIN AND NOT VIA `--command`
 *
 * `psql --command` with several statements in one string sends them as a single
 * simple-query message, and psql before version 15 prints only the LAST
 * result. Homebrew still ships psql 14 while this repo's local Postgres is 15,
 * so a script that ends its SQL with `rollback;` got exactly one line of output
 * on those machines: `ROLLBACK`. Every row it meant to read silently vanished,
 * and the failure looked like an empty database rather than a broken command.
 *
 * Feeding the script on stdin makes psql process one statement at a time, print
 * every result, and honour `ON_ERROR_STOP` between statements, on every
 * version.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PSQL_OUTPUT_ARGS = [
  "--no-psqlrc",
  "--tuples-only",
  "--no-align",
  "--set=ON_ERROR_STOP=on",
] as const;

const PSQL_COMMON_ARGS = [
  "--username",
  "postgres",
  "--dbname",
  "postgres",
  ...PSQL_OUTPUT_ARGS,
] as const;

const PSQL_CONTAINER_ARGS = [
  "--host",
  "127.0.0.1",
  "--port",
  "5432",
  ...PSQL_COMMON_ARGS,
];

const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

function _run(
  options: Readonly<{ file: string; args: readonly string[]; sql: string }>,
): string {
  const { file, args, sql } = options;
  return execFileSync(file, [...args], {
    encoding: "utf8",
    env: { ...process.env, PGPASSWORD: "postgres" },
    input: sql,
    maxBuffer: MAX_OUTPUT_BYTES,
  });
}

/** Returns the local project id and host database port from Supabase config. */
export function getLocalDatabaseConfigFromRepoRoot(
  repoRoot: string,
): { projectId: string; hostPort: string } {
  const configContents = readFileSync(
    path.join(repoRoot, "supabase", "config.toml"),
    "utf8",
  );
  const projectId = /^project_id\s*=\s*"([^"]+)"/mu.exec(configContents)?.[1];
  if (projectId === undefined) {
    throw new Error("Cannot read local Supabase project id from config.toml.");
  }
  const databaseSection = configContents.split(/\n(?=\s*\[)/u).find((section) => {
    return /^\s*\[db\]\s*(?:#.*)?$/mu.test(section);
  });
  const hostPort = /^\s*port\s*=\s*(\d+)/mu.exec(databaseSection ?? "")?.[1];
  if (hostPort === undefined) {
    throw new Error("Cannot read local Supabase database port from config.toml.");
  }
  return { projectId, hostPort };
}

function _runInProjectContainer(
  options: Readonly<{ projectId: string; sql: string }>,
): string {
  return _run({
    file: "docker",
    args: [
      "exec",
      "-i",
      "-e",
      "PGPASSWORD=postgres",
      `supabase_db_${options.projectId}`,
      "psql",
      ...PSQL_CONTAINER_ARGS,
    ],
    sql: options.sql,
  });
}

/**
 * Returns a function that runs SQL against a database and gives back psql's
 * stdout. It throws whatever `execFileSync` throws, so a caller that needs to
 * survive a failure has to catch it.
 *
 * With no `databaseUrl` it targets the local stack, preferring host `psql` and
 * falling back to the one inside the Supabase container. With a `databaseUrl`
 * it targets that database instead, which is how a drift check runs against
 * staging or production. A URL requires host `psql`: the container's client
 * cannot be trusted to reach an external host.
 */
export function makeSqlRunner(
  options: Readonly<{
    projectId: string;
    hostPort: string;
    databaseUrl?: string;
  }>,
): (sql: string) => string {
  const { projectId, hostPort, databaseUrl } = options;
  const hostArgs = [
    "--host",
    "127.0.0.1",
    "--port",
    hostPort,
    ...PSQL_COMMON_ARGS,
  ];
  let useDocker: boolean | undefined = undefined;

  return (sql: string): string => {
    if (databaseUrl !== undefined) {
      return _run({
        file: "psql",
        args: [databaseUrl, ...PSQL_OUTPUT_ARGS],
        sql,
      });
    }
    if (useDocker === undefined) {
      // Prefer host `psql`. Fall back to `psql` inside the Supabase container,
      // because not every machine that runs this repo has a local client.
      useDocker = (() => {
        try {
          _run({ file: "psql", args: hostArgs, sql: "select 1;" });
          return false;
        } catch {
          return true;
        }
      })();
    }
    if (!useDocker) {
      return _run({ file: "psql", args: hostArgs, sql });
    }
    return _runInProjectContainer({ projectId, sql });
  };
}
