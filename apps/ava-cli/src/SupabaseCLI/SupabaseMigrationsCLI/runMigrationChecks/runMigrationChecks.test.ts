import { runMigrationChecks } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks";
import { describe, expect, it } from "vitest";
import type {
  MigrationCheckResult,
  MigrationsSnapshot,
} from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks.types";

const NOW = new Date("2026-08-14T12:00:00Z");

function makeSnapshot(
  overrides: Partial<MigrationsSnapshot> = {},
): MigrationsSnapshot {
  return {
    baseBranch: "origin/develop",
    currentBranch: "feat/thing",
    workingTreeMigrations: [],
    baseBranchMigrations: [],
    modifiedExistingMigrations: [],
    newMigrationContents: {},
    configToml: "",
    now: NOW,
    ...overrides,
  };
}

function findCheck(
  results: MigrationCheckResult[],
  titleFragment: string,
): MigrationCheckResult {
  const result = results.find((candidate) => {
    return candidate.title.includes(titleFragment);
  });
  if (result === undefined) {
    throw new Error(`No check matching "${titleFragment}"`);
  }
  return result;
}

describe("runMigrationChecks", () => {
  /**
   * A check that only names the problem leaves the reader to guess the fix, so
   * every non-passing check has to say what to do about it. This drives one
   * snapshot that trips every check at once.
   */
  it("tells the reader how to fix every check that does not pass", () => {
    const storageFile = "20990101000000_STORAGE-bad.sql";
    const results = runMigrationChecks(
      makeSnapshot({
        baseBranchMigrations: ["20260814010032_base.sql"],
        workingTreeMigrations: [
          "20260814010032_base.sql",
          "no_timestamp.sql",
          "20260101000000_early.sql",
          "20260101000000_early_twin.sql",
          storageFile,
        ],
        modifiedExistingMigrations: ["20260814010032_base.sql"],
        newMigrationContents: {
          [storageFile]: [
            'create policy "p" on storage.objects for select using (true);',
            "alter table public.datasets add column sneaky text;",
            'alter type "public"."app_type" rename to "app_type__old_version_to_be_dropped";',
          ].join("\n"),
        },
      }),
    );

    const unresolved = results
      .filter((result) => {
        return result.status !== "pass";
      })
      .filter((result) => {
        return !result.details.some((detail) => {
          return detail.includes("Fix:");
        });
      })
      .map((result) => {
        return result.title;
      });

    // Guard the guard: a snapshot that stopped tripping the checks would make
    // the assertion above vacuously true.
    expect(
      results.filter((result) => {
        return result.status !== "pass";
      }),
    ).toHaveLength(results.length);
    expect(unresolved).toEqual([]);
  });

  describe("ordering against the base branch", () => {
    it("passes when every new migration sorts after the tip of the base branch", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          baseBranchMigrations: ["20260814010032_base.sql"],
          workingTreeMigrations: [
            "20260814010032_base.sql",
            "20260814114046_mine.sql",
          ],
        }),
      );

      expect(findCheck(results, "sort after").status).toBe("pass");
    });

    it("fails when a new migration sorts before a migration already on the base branch", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          baseBranchMigrations: ["20260814010032_base.sql"],
          workingTreeMigrations: [
            "20260814010032_base.sql",
            "20260813000000_mine.sql",
          ],
        }),
      );

      const check = findCheck(results, "sort after");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("20260813000000_mine.sql");
    });

    it("passes when the branch adds no migrations", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          baseBranchMigrations: ["20260814010032_base.sql"],
          workingTreeMigrations: ["20260814010032_base.sql"],
        }),
      );

      expect(findCheck(results, "sort after").status).toBe("pass");
    });
  });

  describe("filenames", () => {
    it("fails a migration whose name has no timestamp prefix", () => {
      const results = runMigrationChecks(
        makeSnapshot({ workingTreeMigrations: ["add_thing.sql"] }),
      );

      expect(findCheck(results, "well-formed").status).toBe("fail");
    });

    it("fails a timestamp that is not a real date", () => {
      const results = runMigrationChecks(
        makeSnapshot({ workingTreeMigrations: ["20261332000000_bad.sql"] }),
      );

      const check = findCheck(results, "well-formed");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("not a real UTC date");
    });

    it("fails a future-dated migration, which would sort ahead of everything written until then", () => {
      const results = runMigrationChecks(
        makeSnapshot({ workingTreeMigrations: ["20991231235959_future.sql"] }),
      );

      const check = findCheck(results, "well-formed");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("future");
    });
  });

  describe("duplicate timestamps", () => {
    it("fails when two migrations share a timestamp", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: [
            "20260814114046_one.sql",
            "20260814114046_two.sql",
          ],
        }),
      );

      const check = findCheck(results, "unique");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("20260814114046");
    });
  });

  describe("edits to already-applied migrations", () => {
    it("fails when a migration from the base branch was modified", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          modifiedExistingMigrations: ["20260814010032_base.sql"],
        }),
      );

      expect(findCheck(results, "not modified").status).toBe("fail");
    });
  });

  describe("storage conventions", () => {
    it("fails a migration that touches storage without the _STORAGE- marker", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: ["20260814114046_add_bucket.sql"],
          newMigrationContents: {
            "20260814114046_add_bucket.sql":
              'create policy "p" on storage.objects for select using (true);',
          },
        }),
      );

      const check = findCheck(results, "Storage migrations");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("_STORAGE-");
    });

    it("fails a marked migration missing from the seed sql_paths", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: ["20260814114046_STORAGE-add-bucket.sql"],
          newMigrationContents: {
            "20260814114046_STORAGE-add-bucket.sql":
              'create policy "p" on storage.objects for select using (true);',
          },
          configToml: "[db.seed]\nsql_paths = []",
        }),
      );

      const check = findCheck(results, "Storage migrations");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("sql_paths");
    });

    it("passes a marked migration that is registered, storage-only, and idempotent", () => {
      const filename = "20260814114046_STORAGE-add-bucket.sql";
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: [filename],
          newMigrationContents: {
            [filename]: [
              "insert into storage.buckets (id, name) values ('b', 'b') on conflict (id) do nothing;",
              'drop policy if exists "p" on storage.objects;',
              'create policy "p" on storage.objects for select using (true);',
            ].join("\n"),
          },
          configToml: `[db.seed]\nsql_paths = ["./migrations/${filename}"]`,
        }),
      );

      expect(findCheck(results, "Storage migrations").status).toBe("pass");
    });

    it("fails a marked migration that also touches a non-storage table", () => {
      const filename = "20260814114046_STORAGE-add-bucket.sql";
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: [filename],
          newMigrationContents: {
            [filename]: [
              'drop policy if exists "p" on storage.objects;',
              'create policy "p" on storage.objects for select using (true);',
              "alter table public.datasets add column extra text;",
            ].join("\n"),
          },
          configToml: `[db.seed]\nsql_paths = ["./migrations/${filename}"]`,
        }),
      );

      const check = findCheck(results, "Storage migrations");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("non-storage statement");
    });

    it("fails a create policy with no matching drop, which breaks the seed replay", () => {
      const filename = "20260814114046_STORAGE-add-bucket.sql";
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: [filename],
          newMigrationContents: {
            [filename]:
              'create policy "p" on storage.objects for select using (true);',
          },
          configToml: `[db.seed]\nsql_paths = ["./migrations/${filename}"]`,
        }),
      );

      const check = findCheck(results, "Storage migrations");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("42710");
    });

    it("fails a bucket insert with no on conflict clause", () => {
      const filename = "20260814114046_STORAGE-add-bucket.sql";
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: [filename],
          newMigrationContents: {
            [filename]:
              "insert into storage.buckets (id, name) values ('b', 'b');",
          },
          configToml: `[db.seed]\nsql_paths = ["./migrations/${filename}"]`,
        }),
      );

      const check = findCheck(results, "Storage migrations");
      expect(check.status).toBe("fail");
      expect(check.details.join("\n")).toContain("on conflict");
    });
  });

  describe("enum rebuilds from declared-order drift", () => {
    it("does not flag ordinary drops, which are routine in a migration", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: ["20260814114046_drop.sql"],
          newMigrationContents: {
            "20260814114046_drop.sql": [
              'drop table "public"."old_thing";',
              'drop policy if exists "p" on public.datasets;',
              "drop function public.old_fn();",
            ].join("\n"),
          },
        }),
      );

      expect(findCheck(results, "enum rebuild").status).toBe("pass");
    });

    it("warns on the enum rename-and-recreate the diff tool invents", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: ["20260814114046_churn.sql"],
          newMigrationContents: {
            "20260814114046_churn.sql":
              'alter type "public"."app_type" rename to "app_type__old_version_to_be_dropped";',
          },
        }),
      );

      const check = findCheck(results, "enum rebuild");
      expect(check.status).toBe("warn");
      expect(check.details.join("\n")).toContain("app_type");
    });

    it("ignores the pattern when it appears only in a comment", () => {
      const results = runMigrationChecks(
        makeSnapshot({
          workingTreeMigrations: ["20260814114046_note.sql"],
          newMigrationContents: {
            "20260814114046_note.sql":
              "-- removed the _old_version_to_be_dropped block by hand",
          },
        }),
      );

      expect(findCheck(results, "enum rebuild").status).toBe("pass");
    });
  });
});
