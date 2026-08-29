import { RunLocalCommand } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand/RunLocalCommand";
import { afterEach, describe, expect, it, vi } from "vitest";

/** Exercises observable output timing through a real child process. */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RunLocalCommand.run", () => {
  it("streams output before the child exits and retains the result", async () => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let notifyFirstChunk: (() => void) | undefined;
    const firstChunkPromise = new Promise<void>((resolve) => {
      notifyFirstChunk = resolve;
    });
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdoutChunks.push(String(chunk));
      notifyFirstChunk?.();
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderrChunks.push(String(chunk));
      return true;
    });
    let hasCompleted = false;

    const commandPromise = RunLocalCommand.run({
      command: process.execPath,
      args: [
        "-e",
        'process.stdout.write("start"); setTimeout(() => process.stdout.write("ing\\n"), 50); setTimeout(() => process.stderr.write("finished\\n"), 200);',
      ],
      cwd: process.cwd(),
      outputMode: "stream",
      transformStreamLine: (line) => {
        return line.replace("starting", "[redacted]");
      },
    }).then((result) => {
      hasCompleted = true;
      return result;
    });

    await firstChunkPromise;
    expect(hasCompleted).toBe(false);
    await expect(commandPromise).resolves.toEqual({
      ok: true,
      stdout: "starting",
      stderr: "finished",
    });
    expect(stdoutChunks.join("")).toBe("[redacted]\n");
    expect(stderrChunks.join("")).toBe("finished\n");
  });

  it("retains streamed diagnostics when the child fails", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => {
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => {
      return true;
    });

    await expect(
      RunLocalCommand.run({
        command: process.execPath,
        args: [
          "-e",
          'process.stdout.write("partial\\n"); process.stderr.write("failed\\n"); process.exitCode = 7;',
        ],
        cwd: process.cwd(),
        outputMode: "stream",
      }),
    ).resolves.toEqual({
      ok: false,
      stdout: "partial",
      stderr: "failed",
    });
  });
});
