import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// A real environment variable outranks every file these tests mock, and the
// Vitest setup loads the developer's own `.env.development` into
// `process.env`. In a switched worktree that sets both variables below, so
// clear them or every case reads the developer's switch instead of its
// fixture.
beforeEach(() => {
  vi.stubEnv("SUPABASE_PROJECT_ID", undefined);
  vi.stubEnv("SUPABASE_DB_PORT", undefined);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
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

  it("prefers the project and port a switch wrote to .env.development", () => {
    processMocks.readFileSync.mockImplementation((filePath: string) => {
      return filePath === "/repo/.env.development"
        ? 'SUPABASE_PROJECT_ID=feat-x\nSUPABASE_DB_PORT="55322"\n'
        : `project_id = "avandar"\n\n[db]\nport = 54322\n`;
    });

    expect(getLocalDatabaseConfigFromRepoRoot("/repo")).toEqual({
      projectId: "feat-x",
      hostPort: "55322",
    });
  });

  it("prefers a project and port set in the environment over .env.development", () => {
    vi.stubEnv("SUPABASE_PROJECT_ID", "from-shell");
    vi.stubEnv("SUPABASE_DB_PORT", "56322");
    processMocks.readFileSync.mockImplementation((filePath: string) => {
      return filePath === "/repo/.env.development"
        ? 'SUPABASE_PROJECT_ID=feat-x\nSUPABASE_DB_PORT="55322"\n'
        : `project_id = "avandar"\n\n[db]\nport = 54322\n`;
    });

    expect(getLocalDatabaseConfigFromRepoRoot("/repo")).toEqual({
      projectId: "from-shell",
      hostPort: "56322",
    });
  });

  it("reads config.toml alone when the worktree has no .env.development", () => {
    processMocks.readFileSync.mockImplementation((filePath: string) => {
      if (filePath === "/repo/.env.development") {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      return `project_id = "avandar"\n\n[db]\nport = 54322\n`;
    });

    expect(getLocalDatabaseConfigFromRepoRoot("/repo")).toEqual({
      projectId: "avandar",
      hostPort: "54322",
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
