import { EventEmitter } from "node:events";
import path from "node:path";
import { PassThrough } from "node:stream";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { afterEach, describe, expect, it, vi } from "vitest";

const commandMocks = vi.hoisted(() => {
  return { execFile: vi.fn(), spawn: vi.fn() };
});

vi.mock("node:child_process", () => {
  return commandMocks;
});

function _setStreamingCommandSuccess(): void {
  commandMocks.spawn.mockImplementation(() => {
    const childProcess = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    });
    queueMicrotask(() => {
      childProcess.stdout.end(
        `${JSON.stringify({ API_URL: "http://127.0.0.1:55381", SECRET_KEY: "secret" })}\n`,
      );
      childProcess.stderr.end("healthy\n");
      childProcess.emit("close", 0);
    });
    return childProcess;
  });
}

afterEach(() => {
  commandMocks.execFile.mockReset();
  commandMocks.spawn.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("createSupabaseLocalEnvironmentIo streaming", () => {
  it("streams the repository Supabase CLI when requested", async () => {
    _setStreamingCommandSuccess();
    const stdoutChunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => {
      return true;
    });
    const projectRoot = path.resolve(process.cwd());
    const io = createSupabaseLocalEnvironmentIo(projectRoot);

    await expect(
      io.runSupabase(["start"], { outputMode: "stream" }),
    ).resolves.toEqual({
      ok: true,
      stdout: JSON.stringify({
        API_URL: "http://127.0.0.1:55381",
        SECRET_KEY: "secret",
      }),
      stderr: "healthy",
    });
    expect(stdoutChunks.join("")).toBe(
      `${JSON.stringify({ API_URL: "http://127.0.0.1:55381", SECRET_KEY: "[redacted]" })}\n`,
    );
    expect(commandMocks.spawn).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "supabase", "start"],
      expect.objectContaining({
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  });

  it("keeps inherited project overrides away from a streamed Supabase CLI", async () => {
    _setStreamingCommandSuccess();
    vi.spyOn(process.stdout, "write").mockImplementation(() => {
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => {
      return true;
    });
    vi.stubEnv("SUPABASE_PROJECT_ID", "invoking-worktree");
    vi.stubEnv("SUPABASE_API_PORT", "55321");
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    const io = createSupabaseLocalEnvironmentIo(path.resolve(process.cwd()));

    await io.runSupabase(["start"], { outputMode: "stream" });

    const spawnOptions: { env?: NodeJS.ProcessEnv } | undefined =
      commandMocks.spawn.mock.calls[0]?.[2];
    expect(spawnOptions?.env).not.toHaveProperty("SUPABASE_PROJECT_ID");
    expect(spawnOptions?.env).not.toHaveProperty("SUPABASE_API_PORT");
    expect(spawnOptions?.env).toHaveProperty(
      "SUPABASE_URL",
      "http://127.0.0.1:54321",
    );
  });
});
