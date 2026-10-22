import { readLocalRunInvocation } from "@pipelines/shared/readLocalRunInvocation/readLocalRunInvocation";
import { describe, expect, it } from "vitest";

describe("readLocalRunInvocation", () => {
  it("reads the CLI's invocation from the environment", () => {
    expect(
      readLocalRunInvocation({
        environmentValue: JSON.stringify({
          cliArgv: ["pipeline", "run", "hdx", "--local"],
          actor: "pablo@laptop",
          host: "laptop",
          codeVersion: "abc123",
        }),
        fallbackArgv: ["hdx"],
        fallbackHost: "other-host",
      }),
    ).toEqual({
      invokedVia: "cli_local",
      cliArgv: ["pipeline", "run", "hdx", "--local"],
      actor: "pablo@laptop",
      host: "laptop",
      codeVersion: "abc123",
    });
  });

  it.each([
    ["no environment value", undefined],
    ["a value that is not JSON", "nope"],
  ])("falls back to the script's own argv and host for %s", (_label, value) => {
    expect(
      readLocalRunInvocation({
        environmentValue: value,
        fallbackArgv: ["hdx", "--incremental"],
        fallbackHost: "laptop",
      }),
    ).toEqual({
      invokedVia: "cli_local",
      cliArgv: ["hdx", "--incremental"],
      host: "laptop",
    });
  });
});
