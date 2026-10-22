import { hostname, tmpdir, userInfo } from "node:os";
import {
  buildCliInvocation,
  readGitCommit,
} from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import { describe, expect, it } from "vitest";

describe("buildCliInvocation", () => {
  it("records the argv after the binary, the OS user and host, and this checkout's commit", () => {
    expect(buildCliInvocation(["pipeline", "reset", "hdx"])).toEqual({
      cliArgv: ["pipeline", "reset", "hdx"],
      actor: `${userInfo().username}@${hostname()}`,
      host: hostname(),
      codeVersion: expect.stringMatching(/^[0-9a-f]{40}$/),
    });
  });
});

describe("readGitCommit", () => {
  it("is undefined outside a git checkout", () => {
    expect(readGitCommit(tmpdir())).toBeUndefined();
  });
});
