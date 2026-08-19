import type {
  MigrationCheckResult,
  MigrationCheckStatus,
  MigrationsSnapshot,
} from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks.types";

/** `20260814114046_add_thing.sql`: 14 timestamp digits, then a description. */
const MIGRATION_FILENAME_PATTERN = /^(\d{14})_(.+)\.sql$/;

/**
 * Marker for a migration that contains storage statements and nothing else.
 * Only a file carrying it may be replayed by the seed pass.
 */
const STORAGE_MARKER = "_STORAGE-";

/**
 * The rename `supabase db diff` emits when it decides to rebuild an enum
 * rather than leave an already-extended one alone.
 */
const ENUM_CHURN_PATTERN = /_old_version_to_be_dropped/i;

/**
 * A statement in a `_STORAGE-` file must mention a `storage` object. Matches
 * the quoted form too, because the diff tool writes `"storage"."objects"`.
 */
const STORAGE_SCHEMA_PATTERN = /"?\bstorage\b"?\s*\./i;

/**
 * A result that passes when `problems` is empty and fails otherwise.
 *
 * Every check reports the same way, so the shape is built here rather than
 * repeated as a ternary in each one.
 */
function _makeCheckResult(
  options: Readonly<{
    title: string;
    problems: readonly string[];
    passSummary: string;
    failSummary: string;
    /** Defaults to `fail`. Set to `warn` for a check that never blocks. */
    failStatus?: MigrationCheckStatus;
    /** Shown when the check passes. */
    passDetails?: readonly string[];
    /** Appended after the problems when the check does not pass. */
    fixHints?: readonly string[];
  }>,
): MigrationCheckResult {
  const {
    title,
    problems,
    passSummary,
    failSummary,
    failStatus = "fail",
    passDetails = [],
    fixHints = [],
  } = options;

  return problems.length === 0 ?
      { title, status: "pass", summary: passSummary, details: [...passDetails] }
    : {
        title,
        status: failStatus,
        summary: failSummary,
        details: [...problems, ...fixHints],
      };
}

/** The 14-digit prefix, or undefined when the name is not a migration. */
function _getTimestamp(filename: string): string | undefined {
  return MIGRATION_FILENAME_PATTERN.exec(filename)?.[1];
}

/**
 * A migration timestamp read as a UTC date, or undefined when the digits do
 * not describe a real instant. `20261332...` parses as digits but is not a
 * date, and Postgres would happily apply it in the wrong order.
 */
function _parseTimestamp(timestamp: string): Date | undefined {
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // Date.UTC rolls overflow forward (month 13 becomes January), so round-trip
  // the components to reject anything that was not already valid.
  const isRoundTrip =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second;

  return isRoundTrip ? parsed : undefined;
}

/** Migrations this branch adds, in filename order. */
function _getNewMigrations(snapshot: MigrationsSnapshot): string[] {
  const onBase = new Set(snapshot.baseBranchMigrations);
  return snapshot.workingTreeMigrations
    .filter((filename) => {
      return !onBase.has(filename);
    })
    .sort();
}

/** What is wrong with one migration's filename, and how to fix it. */
function _findFilenameProblem(filename: string, now: Date): string | undefined {
  const timestamp = _getTimestamp(filename);
  if (timestamp === undefined) {
    return `${filename} does not match <14-digit-timestamp>_<description>.sql. Fix: rename it, for example 20260814120000_${filename.replace(/\.sql$/, "")}.sql, or regenerate it with \`pnpm db:new-migration <name>\`.`;
  }

  const parsed = _parseTimestamp(timestamp);
  if (parsed === undefined) {
    return `${filename} has a timestamp that is not a real UTC date. Fix: rename it using a real YYYYMMDDHHMMSS instant.`;
  }

  return parsed.getTime() > now.getTime() ?
      `${filename} is dated in the future, so it sorts ahead of every migration written between now and then. Fix: rename it with the current UTC timestamp, and check your system clock if the tool generated it.`
    : undefined;
}

/**
 * Every migration filename parses, and none is dated in the future.
 *
 * A future timestamp is not cosmetic: it wins every ordering comparison until
 * the clock catches up, so the next real migration sorts before it and applies
 * first.
 */
function _checkFilenames(snapshot: MigrationsSnapshot): MigrationCheckResult {
  const newMigrations = _getNewMigrations(snapshot);
  const problems = newMigrations.flatMap((filename) => {
    const problem = _findFilenameProblem(filename, snapshot.now);
    return problem === undefined ? [] : [problem];
  });

  return _makeCheckResult({
    title: "Migration filenames are well-formed and not future-dated",
    problems,
    passSummary:
      newMigrations.length === 0 ?
        "no new migrations to check"
      : `${newMigrations.length} new migration(s) named correctly`,
    failSummary: `${problems.length} filename problem(s)`,
  });
}

/**
 * No two migrations share a timestamp.
 *
 * Duplicates make the apply order depend on a tiebreak nobody chose, so the
 * two files can run in a different order locally than on a fresh database.
 */
function _checkDuplicateTimestamps(
  snapshot: MigrationsSnapshot,
): MigrationCheckResult {
  const byTimestamp = new Map<string, string[]>();
  snapshot.workingTreeMigrations.forEach((filename) => {
    const timestamp = _getTimestamp(filename);
    if (timestamp === undefined) {
      return;
    }
    byTimestamp.set(timestamp, [
      ...(byTimestamp.get(timestamp) ?? []),
      filename,
    ]);
  });

  const problems = [...byTimestamp.entries()]
    .filter(([, filenames]) => {
      return filenames.length > 1;
    })
    .map(([timestamp, filenames]) => {
      return `${timestamp} is used by: ${filenames.join(", ")}. Fix: bump one of them by a second so the apply order is explicit rather than a tiebreak.`;
    });

  return _makeCheckResult({
    title: "Migration timestamps are unique",
    problems,
    passSummary: `${snapshot.workingTreeMigrations.length} migration(s), no duplicate timestamps`,
    failSummary: `${problems.length} duplicated timestamp(s)`,
  });
}

/**
 * Every migration this branch adds sorts after the newest one on the base
 * branch.
 *
 * This is the check that catches the common merge hazard: a migration written
 * before someone else's landed on `develop` applies out of order on any
 * database that already ran theirs.
 */
function _checkOrderingAgainstBase(
  snapshot: MigrationsSnapshot,
): MigrationCheckResult {
  const title = `New migrations sort after everything on "${snapshot.baseBranch}"`;
  const newMigrations = _getNewMigrations(snapshot);
  const latestOnBase = [...snapshot.baseBranchMigrations].sort().pop();

  // Nothing to compare: either this branch adds no migration, or the base has
  // none for a new one to land in front of.
  if (newMigrations.length === 0 || latestOnBase === undefined) {
    const summary =
      newMigrations.length === 0 ?
        `no migrations added on top of "${snapshot.baseBranch}"`
      : `"${snapshot.baseBranch}" has no migrations to conflict with`;
    return { title, status: "pass", summary, details: [] };
  }

  const problems = newMigrations
    .filter((filename) => {
      return filename <= latestOnBase;
    })
    .map((filename) => {
      return `${filename} sorts earlier than ${latestOnBase} and would apply out of order`;
    });

  return _makeCheckResult({
    title,
    problems,
    passSummary: `${newMigrations.length} new migration(s) sort after ${latestOnBase}`,
    passDetails: newMigrations.map((filename) => {
      return `${filename} (new)`;
    }),
    failSummary: `${problems.length} migration(s) sort before the tip of "${snapshot.baseBranch}"`,
    fixHints: [
      "Fix: rename the file(s) with a timestamp later than the one above.",
    ],
  });
}

/**
 * Migrations already on the base branch were not edited.
 *
 * Every other database has applied these by their recorded hash, so an edit
 * here changes a file that will never be re-run. The change belongs in a new
 * migration instead.
 */
function _checkNoEditsToAppliedMigrations(
  snapshot: MigrationsSnapshot,
): MigrationCheckResult {
  return _makeCheckResult({
    title: "Migrations already on the base branch were not modified",
    problems: snapshot.modifiedExistingMigrations,
    passSummary: "no already-applied migration was edited",
    failSummary: `${snapshot.modifiedExistingMigrations.length} already-applied migration(s) edited`,
    fixHints: [
      `Fix: revert these and put the change in a new migration. Databases that ran "${snapshot.baseBranch}" will never re-apply them.`,
    ],
  });
}

/** SQL statements, with comments stripped and blanks dropped. */
function _splitStatements(contents: string): string[] {
  return contents
    .split("\n")
    .filter((line) => {
      return !line.trimStart().startsWith("--");
    })
    .join("\n")
    .split(";")
    .map((statement) => {
      return statement.trim();
    })
    .filter((statement) => {
      return statement.length > 0;
    });
}

/**
 * Statements in a `_STORAGE-` file that do not touch the `storage` schema.
 *
 * The seed pass replays the whole file against a database that already
 * applied it as a migration, so anything here runs twice. A helper function
 * or a `public` table change belongs in its own separate migration, ordered
 * before this one.
 */
function _findNonStorageStatements(
  filename: string,
  contents: string,
): string[] {
  return _splitStatements(contents)
    .filter((statement) => {
      return !STORAGE_SCHEMA_PATTERN.test(statement);
    })
    .map((statement) => {
      const firstLine = statement.split("\n")[0] ?? statement;
      return `${filename} has a non-storage statement, which the seed pass would run a second time: ${firstLine}. Fix: move it into its own migration ordered before this one, and keep this file storage-only.`;
    });
}

/**
 * Statements in a `_STORAGE-` file that would fail on the replay.
 *
 * A bare `create policy` aborts `supabase db reset` with SQLSTATE 42710 the
 * second time it runs, and a bucket insert without `on conflict` hits the
 * primary key.
 */
function _findNonIdempotentStatements(
  filename: string,
  contents: string,
): string[] {
  const statements = _splitStatements(contents);
  const droppedPolicies = new Set(
    statements.flatMap((statement) => {
      const dropped = /drop\s+policy\s+if\s+exists\s+("[^"]+"|\S+)/i.exec(
        statement,
      );
      return dropped?.[1] === undefined ? [] : [dropped[1]];
    }),
  );

  return statements.flatMap((statement) => {
    const createdPolicy = /create\s+policy\s+("[^"]+"|\S+)/i.exec(statement);
    if (createdPolicy?.[1] !== undefined) {
      return droppedPolicies.has(createdPolicy[1]) ?
          []
        : [
            `${filename} creates policy ${createdPolicy[1]} with no matching "drop policy if exists", so replaying it fails with SQLSTATE 42710. Fix: add \`drop policy if exists ${createdPolicy[1]} on storage.objects;\` immediately before it.`,
          ];
    }

    const insertsBucket = /insert\s+into\s+storage\.buckets/i.test(statement);
    return insertsBucket && !/on\s+conflict/i.test(statement) ?
        [
          `${filename} inserts into storage.buckets with no "on conflict", so replaying it fails on the primary key. Fix: append \`on conflict (id) do nothing\`.`,
        ]
      : [];
  });
}

/** Everything wrong with one new storage migration, if anything. */
function _findStorageProblems(
  filename: string,
  snapshot: MigrationsSnapshot,
): string[] {
  const contents = snapshot.newMigrationContents[filename] ?? "";
  if (!filename.includes(STORAGE_MARKER)) {
    return [
      `${filename} touches storage but lacks the "${STORAGE_MARKER}" marker. Fix: rename it to <timestamp>${STORAGE_MARKER}<description>.sql and add it to [db.seed] sql_paths so the seed pass replays it.`,
    ];
  }

  // Only a seeded file is replayed, and only a replayed file has to be
  // idempotent. That is why a legacy non-idempotent migration is left out of
  // `sql_paths` rather than edited.
  const isSeeded = snapshot.configToml.includes(filename);
  return [
    ...(isSeeded ?
      []
    : [
        `${filename} is not listed in [db.seed] sql_paths in supabase/config.toml, so it will not be replayed. Fix: add "./migrations/${filename}" to sql_paths, positioned after any file whose policies it narrows.`,
      ]),
    ..._findNonStorageStatements(filename, contents),
    ...(isSeeded ? _findNonIdempotentStatements(filename, contents) : []),
  ];
}

/**
 * Storage migrations carry the `_STORAGE-` marker, are listed under
 * `[db.seed] sql_paths`, touch only the `storage` schema, and are idempotent.
 *
 * Storage is the one area the schema diff cannot author, so these files are
 * hand-written and replayed by the seed pass. A file that touches storage
 * without the marker is not replayed, and a marked file missing from
 * `sql_paths` silently leaves a bucket with no policies.
 */
function _checkStorageConventions(
  snapshot: MigrationsSnapshot,
): MigrationCheckResult {
  const storageMigrations = Object.entries(snapshot.newMigrationContents)
    .filter(([filename, contents]) => {
      // Match against executable SQL only, never comments. A migration that
      // merely mentions storage in prose is not a storage migration, and
      // must NOT get the marker: the marker puts a file in `sql_paths`,
      // where it is replayed against an already-migrated database, so a
      // non-storage file there would re-run its statements out of order.
      //
      // This bit us on a migration whose comment cited
      // `storage.foldername(name)[2]` to explain a `public` function it was
      // changing. Scanning raw contents flagged it as a storage migration.
      return (
        _splitStatements(contents).some((statement) => {
          return STORAGE_SCHEMA_PATTERN.test(statement);
        }) || filename.includes(STORAGE_MARKER)
      );
    })
    .map(([filename]) => {
      return filename;
    });

  const problems = storageMigrations.flatMap((filename) => {
    return _findStorageProblems(filename, snapshot);
  });

  return _makeCheckResult({
    title:
      "Storage migrations are marked, seeded, storage-only, and idempotent",
    problems,
    passSummary:
      storageMigrations.length === 0 ?
        "no new storage migrations"
      : `${storageMigrations.length} storage migration(s) follow the seed rules`,
    failSummary: `${problems.length} storage convention problem(s)`,
  });
}

/**
 * Enum rebuilds caused by declared value order drifting from stored order.
 *
 * Dropping and recreating things is normal in a migration, so drops are not
 * flagged. This pattern is different, and it is not how a value gets added:
 * `alter type ... add value if not exists` does that, and appends the label at
 * the end. The rebuild appears when the schema file then lists that label
 * somewhere other than last, because reordering enum values is the one change
 * Postgres cannot make in place. Shipping it rewrites every column using the
 * type, so the fix is almost always to reorder the declaration instead.
 */
function _checkSchemaDiffArtifacts(
  snapshot: MigrationsSnapshot,
): MigrationCheckResult {
  const problems = Object.entries(snapshot.newMigrationContents).flatMap(
    ([filename, contents]) => {
      return contents.split("\n").flatMap((line, idx) => {
        const isChurn =
          !line.trimStart().startsWith("--") && ENUM_CHURN_PATTERN.test(line);
        return isChurn ? [`${filename}:${idx + 1}: ${line.trim()}`] : [];
      });
    },
  );

  return _makeCheckResult({
    title: "No enum rebuilds from declared-order drift",
    problems,
    passSummary: "no enum rename-and-recreate blocks",
    failSummary: `${problems.length} enum rebuild statement(s) to confirm`,
    failStatus: "warn",
    fixHints: [
      "This is a reorder, not a new value: `alter type ... add value` appends a label at the end.",
      "Fix: the schema file usually lists a previously-appended label too early. Move it to the end of the enum so the declared order matches the stored order, then regenerate.",
      "Ship the rebuild only if you really intend to reorder: it rewrites every column using the type.",
    ],
  });
}

/**
 * Every migration check, in the order they are printed.
 *
 * Pure: all input arrives on `snapshot`, so the caller owns git and the
 * filesystem and these stay testable.
 */
export function runMigrationChecks(
  snapshot: Readonly<MigrationsSnapshot>,
): MigrationCheckResult[] {
  return [
    _checkFilenames(snapshot),
    _checkDuplicateTimestamps(snapshot),
    _checkOrderingAgainstBase(snapshot),
    _checkNoEditsToAppliedMigrations(snapshot),
    _checkStorageConventions(snapshot),
    _checkSchemaDiffArtifacts(snapshot),
  ];
}
