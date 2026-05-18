/*
 * Sqlglot invocation + post-processing. Two responsibilities:
 *
 *   1. Shell out to `uv run --with 'sqlglot...' python ...` to transpile
 *      a batch of Postgres statements to SQLite, and to assert that
 *      uv + sqlglot are even available before the first call.
 *   2. Post-process sqlglot's SQLite output to scrub leftover Postgres
 *      tokens SQLite would reject (`"public".` schema prefixes,
 *      `NOT VALID`, `DEFAULT <fn>()`, `USING btree`, `NULLS LAST`,
 *      `ARRAY<TEXT>`, `IF NOT EXISTS` after `ADD COLUMN`).
 */

import { spawnSync } from "node:child_process";

/*
 * Pin the sqlglot version this script depends on. uv resolves and
 * caches this spec on first run; bumping the version is a one-line
 * change.
 *
 * Range form (`>=A,<B`) lets uv pick the latest patch within the
 * major, which is cheap to update via `uv cache prune` if needed.
 */
export const SQLGLOT_SPEC = "sqlglot>=26.0.0,<27.0.0";

/**
 * Probe that uv is installed and can resolve `sqlglot` under
 * {@link SQLGLOT_SPEC}. Call once at the top of the generator; throws
 * with a friendly install hint if either prerequisite is missing.
 */
export function assertSqlglotAvailable(): void {
  // 1. uv itself must be installed.
  const uvCheck = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (uvCheck.status !== 0) {
    throw new Error(
      "uv is required to run this script. Install it (e.g. `brew install uv` on macOS, or follow https://astral.sh/uv). See apps/desktop/migrations/README.md.",
    );
  }
  // 2. uv must be able to resolve and import sqlglot under
  //    SQLGLOT_SPEC. First run downloads sqlglot into uv's cache;
  //    subsequent runs reuse the cached env.
  const probe = spawnSync(
    "uv",
    [
      "run",
      "--quiet",
      "--with",
      SQLGLOT_SPEC,
      "python",
      "-c",
      "import sqlglot; print(sqlglot.__version__)",
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) {
    throw new Error(
      `Failed to resolve sqlglot via uv (spec: ${SQLGLOT_SPEC}):\n${probe.stderr}`,
    );
  }
}

/**
 * Transpile a batch of Postgres statements to SQLite via sqlglot. Feeds
 * every statement to a single sqlglot invocation so we pay Python
 * startup cost once per migration file rather than once per statement.
 *
 * @param statements - SQL strings (no trailing semicolons required).
 * @returns The transpiled SQLite-flavoured strings, in input order.
 */
export function transpileToSqlite(
  statements: readonly string[],
): string[] {
  const joined = statements.join(";\n") + ";";
  const py = [
    "import sys, sqlglot",
    "sql = sys.stdin.read()",
    'out = sqlglot.transpile(sql, read="postgres", write="sqlite")',
    'print("\\n;;;SQLGLOT_DELIM;;;\\n".join(out))',
  ].join("\n");
  const result = spawnSync(
    "uv",
    ["run", "--quiet", "--with", SQLGLOT_SPEC, "python", "-c", py],
    { input: joined, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`sqlglot transpile failed:\n${result.stderr}`);
  }
  return result.stdout
    .split("\n;;;SQLGLOT_DELIM;;;\n")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s.length > 0;
    });
}

/**
 * Post-process sqlglot's SQLite output to strip Postgres-specific noise
 * that survives the transpile pass:
 *
 * - `"public".name` and `public.name` -> just `name`. SQLite treats a
 *   dot prefix as an attached-database name, not a schema, so the
 *   original prefix is a parse error.
 * - `NOT VALID` on ADD CONSTRAINT -> dropped. Postgres-only modifier
 *   meaning "do not validate existing rows"; SQLite always validates.
 * - `DEFAULT <fn>(...)` -> dropped. Postgres builtins like
 *   `gen_random_uuid()` and `auth.uid()` survive as `UUID()` /
 *   `auth.uid()` in the transpile, which SQLite cannot evaluate at
 *   DDL time. The sync bootstrap inserts rows with explicit values,
 *   so defaults of this form are dead weight on the SQLite mirror
 *   anyway. `DEFAULT CURRENT_TIMESTAMP` (a keyword, no parens) is
 *   preserved.
 * - `USING btree` (and other Postgres index methods) inside CREATE
 *   INDEX: SQLite indexes are always B-trees and reject the explicit
 *   clause.
 * - `NULLS FIRST` / `NULLS LAST` inside CREATE INDEX: SQLite indexes
 *   do not accept null-ordering clauses (supported only in ORDER BY
 *   since 3.30, not in index definitions at all).
 * - `ARRAY<TEXT>` (sqlglot's normalisation of Postgres `TEXT[]`) is
 *   a syntax error on SQLite. Collapse to plain `TEXT`; the runtime
 *   stores arrays as JSON strings.
 * - `ADD COLUMN IF NOT EXISTS` -> `ADD COLUMN`. Fresh-DB-on-replay
 *   means the column won't exist anyway, so the guard is unneeded.
 *
 * @param sql - A single transpiled SQLite statement from sqlglot.
 * @returns The same statement with Postgres noise stripped.
 */
export function stripPostgresIsms(sql: string): string {
  let out = sql;
  out = out.replace(/"public"\s*\./gi, "");
  out = out.replace(/\bpublic\s*\./gi, "");
  out = out.replace(/\s+NOT\s+VALID\b/gi, "");
  out = out.replace(
    /\s+DEFAULT\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?\s*\([^)]*\)/gi,
    "",
  );
  out = out.replace(/\s+USING\s+(btree|gin|gist|hash|brin|spgist)\b/gi, "");
  out = out.replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, "");
  out = out.replace(/\bARRAY\s*<[^>]+>/gi, "TEXT");
  out = out.replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, "ADD COLUMN");
  return out;
}
