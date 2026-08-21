import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalDatabaseConfigFromRepoRoot, makeSqlRunner } from "./PsqlUtils";

const processMocks = vi.hoisted(() => {
  return {
    execFileSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const originalModule =
    await importOriginal<typeof import("node:child_process")>();
  const mockedModule = {
    ...originalModule,
    execFileSync: processMocks.execFileSync,
  };
  return { ...mockedModule, default: mockedModule };
});

vi.mock("node:fs", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("node:fs")>();
  const mockedModule = {
    ...originalModule,
    readFileSync: processMocks.readFileSync,
  };
  return { ...mockedModule, default: mockedModule };
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("psql", () => {
  it("reads the project id and database port from local config", () => {
    processMocks.readFileSync.mockReturnValue(`project_id = "fix-switch"

[api]
port = 55381

[db]
port = 55382
`);

    expect(getLocalDatabaseConfigFromRepoRoot("/repo")).toEqual({
      projectId: "fix-switch",
      hostPort: "55382",
    });
  });

  it("runs host psql on the configured switched port", () => {
    processMocks.execFileSync
      .mockReturnValueOnce("1\n")
      .mockReturnValueOnce("result\n");
    const runSql = makeSqlRunner({
      projectId: "fix-switch",
      hostPort: "55382",
    });

    expect(runSql("select current_database();")).toBe("result\n");
    expect(processMocks.execFileSync).toHaveBeenNthCalledWith(
      1,
      "psql",
      expect.arrayContaining(["--port", "55382"]),
      expect.objectContaining({ input: "select 1;" }),
    );
    expect(processMocks.execFileSync).toHaveBeenNthCalledWith(
      2,
      "psql",
      expect.arrayContaining(["--port", "55382"]),
      expect.objectContaining({ input: "select current_database();" }),
    );
  });

  it("falls back to the exact project container", () => {
    processMocks.execFileSync
      .mockImplementationOnce(() => {
        throw new Error("host psql unavailable");
      })
      .mockReturnValueOnce("result\n");
    const runSql = makeSqlRunner({
      projectId: "fix-switch",
      hostPort: "55382",
    });

    expect(runSql("select current_database();")).toBe("result\n");
    expect(processMocks.execFileSync).toHaveBeenLastCalledWith(
      "docker",
      expect.arrayContaining(["supabase_db_fix-switch", "psql"]),
      expect.objectContaining({ input: "select current_database();" }),
    );
  });

  it("rejects config without a database port", () => {
    processMocks.readFileSync.mockReturnValue(`project_id = "fix-switch"

[db]
major_version = 15
`);

    expect(() => {
      getLocalDatabaseConfigFromRepoRoot("/repo");
    }).toThrow("Cannot read local Supabase database port");
  });

  it("rejects config without a project id", () => {
    processMocks.readFileSync.mockReturnValue(`[db]
port = 55382
`);

    expect(() => {
      getLocalDatabaseConfigFromRepoRoot("/repo");
    }).toThrow("Cannot read local Supabase project id");
  });
});
