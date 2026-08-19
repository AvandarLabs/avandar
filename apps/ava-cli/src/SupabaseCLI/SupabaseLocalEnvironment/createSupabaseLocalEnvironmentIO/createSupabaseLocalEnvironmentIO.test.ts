import { rm } from "node:fs/promises";
import path from "node:path";
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { promiseMap } from "@avandar/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

const commandMocks = vi.hoisted(() => {
  return { execFile: vi.fn() };
});

vi.mock("node:child_process", () => {
  return { execFile: commandMocks.execFile };
});

let temporaryDirectories: string[] = [];

const EMPTY_DOCKER_RESOURCE_LIST_ARGUMENTS = [
  [
    "container",
    "ls",
    "-a",
    "--no-trunc",
    "--filter",
    "label=com.supabase.cli.project=local-project",
    "--format",
    "{{.ID}}",
  ],
  [
    "network",
    "ls",
    "--no-trunc",
    "--filter",
    "label=com.supabase.cli.project=local-project",
    "--format",
    "{{.ID}}",
  ],
  [
    "volume",
    "ls",
    "--filter",
    "label=com.supabase.cli.project=local-project",
    "--format",
    "{{.Name}}",
  ],
] as const;

afterEach(async () => {
  const directoriesToRemove = temporaryDirectories;
  temporaryDirectories = [];
  await promiseMap(directoriesToRemove, async (directoryPath) => {
    await rm(directoryPath, { recursive: true, force: true });
  });
  commandMocks.execFile.mockReset();
  vi.unstubAllEnvs();
});

function _setCommandFailure(
  options: Readonly<{ stderr: string; stdout: string }>,
): void {
  commandMocks.execFile.mockImplementation((...args) => {
    const callback = args.at(-1);
    if (typeof callback !== "function") {
      throw new Error("Expected execFile callback.");
    }
    callback(
      Object.assign(new Error("Command failed."), {
        stderr: options.stderr,
        stdout: options.stdout,
      }),
    );
  });
}

function _setCommandSuccess(
  results: ReadonlyArray<{ stderr: string; stdout: string }>,
): void {
  const remainingResults = [...results];
  commandMocks.execFile.mockImplementation((...args) => {
    const callback = args.at(-1);
    const result = remainingResults.shift();
    if (typeof callback !== "function" || result === undefined) {
      throw new Error("Expected an available execFile result and callback.");
    }
    callback(undefined, {
      stdout: result.stdout,
      stderr: result.stderr,
    });
  });
}

function _expectDockerCommands(
  options: Readonly<{
    projectRoot: string;
    argumentLists: ReadonlyArray<readonly string[]>;
  }>,
): void {
  expect(commandMocks.execFile).toHaveBeenCalledTimes(
    options.argumentLists.length,
  );
  options.argumentLists.forEach((argumentsList, commandIndex) => {
    expect(commandMocks.execFile).toHaveBeenNthCalledWith(
      commandIndex + 1,
      "docker",
      argumentsList,
      {
        cwd: options.projectRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
      expect.any(Function),
    );
  });
}

describe("createSupabaseLocalEnvironmentIO (commands, Docker, Git, ports)", () => {
  it("returns a failed Supabase command result without throwing", async () => {
    _setCommandFailure({
      stderr: "Supabase failed.",
      stdout: "partial output",
    });
    const io = createSupabaseLocalEnvironmentIO(process.cwd());

    await expect(io.runSupabase(["status"])).resolves.toEqual({
      ok: false,
      stdout: "partial output",
      stderr: "Supabase failed.",
    });
  });

  it("runs Supabase with exactly the supplied arguments in the project root", async () => {
    _setCommandSuccess([{ stderr: "", stdout: "status output" }]);
    const projectRoot = path.resolve(process.cwd());
    const suppliedArgs = ["status", "--output", "json"];
    const io = createSupabaseLocalEnvironmentIO(projectRoot);

    await expect(io.runSupabase(suppliedArgs)).resolves.toEqual({
      ok: true,
      stdout: "status output",
      stderr: "",
    });
    expect(commandMocks.execFile).toHaveBeenCalledTimes(1);
    expect(commandMocks.execFile).toHaveBeenCalledWith(
      "supabase",
      suppliedArgs,
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
      expect.any(Function),
    );
  });

  it("overrides the inherited connection when seeding", async () => {
    _setCommandSuccess([{ stderr: "", stdout: "seeded" }]);
    const projectRoot = path.resolve(process.cwd());
    const io = createSupabaseLocalEnvironmentIO(projectRoot);
    // The pre-switch connection `ava` loaded at startup, which the seed must
    // not inherit.
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "stale-key");

    await expect(
      io.runSeed({
        supabaseUrl: "http://127.0.0.1:55321",
        serviceRoleKey: "fresh-key",
      }),
    ).resolves.toEqual({ ok: true, stdout: "seeded", stderr: "" });
    expect(commandMocks.execFile).toHaveBeenCalledWith(
      "pnpm",
      ["vite-script", "scripts/seedDatabaseScript.ts"],
      expect.objectContaining({
        cwd: projectRoot,
        env: expect.objectContaining({
          SUPABASE_URL: "http://127.0.0.1:55321",
          SUPABASE_SERVICE_ROLE_KEY: "fresh-key",
        }),
      }),
      expect.any(Function),
    );
  });

  it("rejects resource ownership checks when a Docker query fails", async () => {
    _setCommandFailure({ stderr: "Docker unavailable.", stdout: "" });
    const io = createSupabaseLocalEnvironmentIO(process.cwd());

    await expect(io.hasSupabaseResources("local-project")).rejects.toThrow(
      "Cannot verify local Supabase project ownership: Docker unavailable.",
    );
    expect(commandMocks.execFile).toHaveBeenCalledTimes(3);
  });

  it("returns false after exact empty Docker resource queries", async () => {
    _setCommandSuccess([
      { stderr: "", stdout: "" },
      { stderr: "", stdout: "" },
      { stderr: "", stdout: "" },
    ]);
    const projectRoot = path.resolve(process.cwd());
    const io = createSupabaseLocalEnvironmentIO(projectRoot);
    const projectId = "local-project";

    await expect(io.hasSupabaseResources(projectId)).resolves.toBe(false);
    _expectDockerCommands({
      projectRoot,
      argumentLists: EMPTY_DOCKER_RESOURCE_LIST_ARGUMENTS,
    });
  });

  it("returns true when any Docker resource query reports an identifier", async () => {
    _setCommandSuccess([
      { stderr: "", stdout: "" },
      { stderr: "", stdout: "network-id" },
      { stderr: "", stdout: "" },
    ]);
    const io = createSupabaseLocalEnvironmentIO(path.resolve(process.cwd()));

    await expect(io.hasSupabaseResources("local-project")).resolves.toBe(true);
  });

  it("enumerates only exact-label Docker resources in dependency order", async () => {
    _setCommandSuccess([
      { stderr: "", stdout: `${"a".repeat(64)}\n${"b".repeat(64)}` },
      { stderr: "", stdout: "c".repeat(64) },
      { stderr: "", stdout: "supabase_db_local-project" },
    ]);
    const projectRoot = path.resolve(process.cwd());
    const io = createSupabaseLocalEnvironmentIO(projectRoot);

    await expect(io.listSupabaseResources("local-project")).resolves.toEqual([
      { type: "container", id: "a".repeat(64) },
      { type: "container", id: "b".repeat(64) },
      { type: "network", id: "c".repeat(64) },
      { type: "volume", id: "supabase_db_local-project" },
    ]);
    expect(commandMocks.execFile).toHaveBeenNthCalledWith(
      1,
      "docker",
      [
        "container",
        "ls",
        "-a",
        "--no-trunc",
        "--filter",
        "label=com.supabase.cli.project=local-project",
        "--format",
        "{{.ID}}",
      ],
      expect.objectContaining({ cwd: projectRoot }),
      expect.any(Function),
    );
    expect(commandMocks.execFile).toHaveBeenNthCalledWith(
      3,
      "docker",
      [
        "volume",
        "ls",
        "--filter",
        "label=com.supabase.cli.project=local-project",
        "--format",
        "{{.Name}}",
      ],
      expect.objectContaining({ cwd: projectRoot }),
      expect.any(Function),
    );
  });

  it.each([
    {
      resource: { type: "container" as const, id: "a".repeat(64) },
      labelTemplate:
        '{{json (index .Config.Labels "com.supabase.cli.project")}}',
    },
    {
      resource: { type: "network" as const, id: "b".repeat(64) },
      labelTemplate: '{{json (index .Labels "com.supabase.cli.project")}}',
    },
    {
      resource: { type: "volume" as const, id: "supabase_db_local-project" },
      labelTemplate: '{{json (index .Labels "com.supabase.cli.project")}}',
    },
  ])(
    "re-reads a $resource.type project label by exact identifier",
    async ({ resource, labelTemplate }) => {
      _setCommandSuccess([{ stderr: "", stdout: '"local-project"' }]);
      const projectRoot = path.resolve(process.cwd());
      const io = createSupabaseLocalEnvironmentIO(projectRoot);

      await expect(io.inspectSupabaseResource(resource)).resolves.toEqual({
        exists: true,
        projectId: "local-project",
      });
      expect(commandMocks.execFile).toHaveBeenCalledWith(
        "docker",
        [resource.type, "inspect", "--format", labelTemplate, resource.id],
        expect.objectContaining({ cwd: projectRoot }),
        expect.any(Function),
      );
    },
  );

  it("treats an already-absent Docker resource as absent", async () => {
    _setCommandFailure({ stderr: "Error: No such volume: gone", stdout: "" });
    const io = createSupabaseLocalEnvironmentIO(path.resolve(process.cwd()));

    await expect(
      io.inspectSupabaseResource({ type: "volume", id: "gone" }),
    ).resolves.toEqual({ exists: false });
  });

  it("does not hide Docker inspection failures unrelated to absence", async () => {
    _setCommandFailure({ stderr: "Docker unavailable.", stdout: "" });
    const io = createSupabaseLocalEnvironmentIO(path.resolve(process.cwd()));

    await expect(
      io.inspectSupabaseResource({ type: "network", id: "a".repeat(64) }),
    ).rejects.toThrow("Cannot inspect Docker network");
  });

  it.each([
    {
      resource: { type: "container" as const, id: "a".repeat(64) },
      args: ["container", "rm", "--force", "a".repeat(64)],
    },
    {
      resource: { type: "network" as const, id: "b".repeat(64) },
      args: ["network", "rm", "b".repeat(64)],
    },
    {
      resource: { type: "volume" as const, id: "supabase_db_local-project" },
      args: ["volume", "rm", "supabase_db_local-project"],
    },
  ])(
    "removes a $resource.type with its exact identifier",
    async ({ resource, args }) => {
      _setCommandSuccess([{ stderr: "", stdout: "removed" }]);
      const projectRoot = path.resolve(process.cwd());
      const io = createSupabaseLocalEnvironmentIO(projectRoot);

      await expect(io.removeSupabaseResource(resource)).resolves.toEqual({
        ok: true,
        stdout: "removed",
        stderr: "",
      });
      expect(commandMocks.execFile).toHaveBeenCalledWith(
        "docker",
        args,
        expect.objectContaining({ cwd: projectRoot }),
        expect.any(Function),
      );
    },
  );

  it("propagates a failed Git branch query", async () => {
    _setCommandFailure({ stderr: "Git unavailable.", stdout: "" });
    const io = createSupabaseLocalEnvironmentIO(process.cwd());

    await expect(io.readBranch()).rejects.toThrow(
      "Cannot read the current Git branch: Git unavailable.",
    );
  });
});
