import { spawnSync } from "node:child_process";
import { hostname, tmpdir, userInfo } from "node:os";
import {
  buildCliInvocation,
  readGitCommit,
} from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return { ...original, spawnSync: vi.fn(original.spawnSync) };
});

describe("buildCliInvocation", () => {
  it("records the argv after the binary, the OS user and host, and this checkout's commit", () => {
    expect(
      buildCliInvocation({
        cliArgv: ["pipeline", "reset", "hdx"],
        shouldReadCodeVersion: true,
      }),
    ).toEqual({
      cliArgv: ["pipeline", "reset", "hdx"],
      actor: `${userInfo().username}@${hostname()}`,
      host: hostname(),
      codeVersion: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
  });

  it("leaves out the commit, without running git, when not asked to read it", () => {
    vi.mocked(spawnSync).mockClear();

    const invocation = buildCliInvocation({
      cliArgv: [],
      shouldReadCodeVersion: false,
    });

    expect([invocation, vi.mocked(spawnSync).mock.calls.length]).toEqual([
      {
        cliArgv: [],
        actor: `${userInfo().username}@${hostname()}`,
        host: hostname(),
      },
      0,
    ]);
  });
});

describe("buildCliInvocation from another directory", () => {
  it("still records this checkout's commit, not the working directory's", () => {
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpdir());
    try {
      expect(
        buildCliInvocation({ cliArgv: [], shouldReadCodeVersion: true })
          .codeVersion,
      ).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      cwdSpy.mockRestore();
    }
  });
});

describe("readGitCommit", () => {
  it("is undefined outside a git checkout", () => {
    expect(readGitCommit(tmpdir())).toBeUndefined();
  });
});
