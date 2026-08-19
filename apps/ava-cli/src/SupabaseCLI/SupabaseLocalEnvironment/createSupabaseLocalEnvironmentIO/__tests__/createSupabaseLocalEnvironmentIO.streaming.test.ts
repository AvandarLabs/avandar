import { EventEmitter } from "node:events";
import path from "node:path";
import { PassThrough } from "node:stream";
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
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
});

describe("createSupabaseLocalEnvironmentIO streaming", () => {
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
    const io = createSupabaseLocalEnvironmentIO(projectRoot);

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
      {
        cwd: projectRoot,
        env: undefined,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  });
});
