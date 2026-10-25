import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { runSupabaseSql } from "@ava-cli/SupabaseCli/SupabaseSqlCli/SupabaseSqlCli";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return { spawn: vi.fn() };
});

const SWITCHED_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55342/postgres";

/**
 * Makes the next `spawn` return a child process that ends the way `outcome`
 * says: exiting with a code, or failing to start with an error code.
 */
function _mockPsqlOutcome(
  outcome: { exitCode: number } | { errorCode: string },
): void {
  vi.mocked(spawn).mockImplementationOnce(() => {
    const child = new EventEmitter();
    queueMicrotask(() => {
      if ("exitCode" in outcome) {
        child.emit("close", outcome.exitCode);
        return;
      }
      child.emit(
        "error",
        Object.assign(new Error("spawn failed"), { code: outcome.errorCode }),
      );
    });
    return child as ReturnType<typeof spawn>;
  });
}

function _getSpawnCall(): readonly unknown[] {
  return vi.mocked(spawn).mock.calls[0] ?? [];
}

describe("runSupabaseSql", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_POSTGRES_URL = SWITCHED_DATABASE_URL;
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
    vi.spyOn(AvaEnv, "getLoadedEnvTarget").mockReturnValue("local");
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("runs the SQL with psql -c against SUPABASE_POSTGRES_URL", async () => {
    _mockPsqlOutcome({ exitCode: 0 });

    await runSupabaseSql({ sql: "select 1" });

    expect(_getSpawnCall().slice(0, 2)).toEqual([
      "psql",
      [SWITCHED_DATABASE_URL, "-c", "select 1"],
    ]);
  });

  it("opens an interactive psql shell when no SQL is given", async () => {
    _mockPsqlOutcome({ exitCode: 0 });

    await runSupabaseSql({ sql: undefined });

    expect(_getSpawnCall().slice(0, 2)).toEqual([
      "psql",
      [SWITCHED_DATABASE_URL],
    ]);
  });

  it("shares the terminal with psql so its output and prompt reach it", async () => {
    _mockPsqlOutcome({ exitCode: 0 });

    await runSupabaseSql({ sql: undefined });

    expect(_getSpawnCall()[2]).toEqual({ stdio: "inherit" });
  });

  it("opens a shell when the SQL is only whitespace", async () => {
    _mockPsqlOutcome({ exitCode: 0 });

    await runSupabaseSql({ sql: "   " });

    expect(_getSpawnCall()[1]).toEqual([SWITCHED_DATABASE_URL]);
  });

  it("refuses to connect on --prod", async () => {
    vi.mocked(AvaEnv.getLoadedEnvTarget).mockReturnValue("production");

    await expect(runSupabaseSql({ sql: "select 1" })).rejects.toThrow(
      "only runs against the local database",
    );
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("refuses to connect on --staging", async () => {
    vi.mocked(AvaEnv.getLoadedEnvTarget).mockReturnValue("staging");

    await expect(runSupabaseSql({ sql: "select 1" })).rejects.toThrow(
      "only runs against the local database",
    );
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("refuses a SUPABASE_POSTGRES_URL that is not on this machine", async () => {
    process.env.SUPABASE_POSTGRES_URL =
      "postgresql://postgres:secret@db.example.supabase.co:5432/postgres";

    await expect(runSupabaseSql({ sql: "select 1" })).rejects.toThrow(
      "is not a local database",
    );
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
  });

  it("throws naming the env file when SUPABASE_POSTGRES_URL is missing", async () => {
    delete process.env.SUPABASE_POSTGRES_URL;

    await expect(runSupabaseSql({ sql: "select 1" })).rejects.toThrow(
      "SUPABASE_POSTGRES_URL is not set in .env.development",
    );
  });

  it("exits with psql's exit code, without throwing, when psql fails", async () => {
    _mockPsqlOutcome({ exitCode: 3 });

    await runSupabaseSql({ sql: "select nope" });

    expect(process.exitCode).toBe(3);
  });

  it("explains how to install psql when it is not on PATH", async () => {
    _mockPsqlOutcome({ errorCode: "ENOENT" });

    await expect(runSupabaseSql({ sql: "select 1" })).rejects.toThrow(
      "brew install libpq",
    );
  });
});
