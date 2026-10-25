import { buildServerRunInvocation } from "@pipeline-server/routes/pipeline-name/buildServerRunInvocation/buildServerRunInvocation";
import { describe, expect, it } from "vitest";

describe("buildServerRunInvocation", () => {
  it("records a CLI caller's argv and actor, with the server's host and commit", () => {
    expect(
      buildServerRunInvocation({
        invocationHeader: JSON.stringify({
          cliArgv: ["pipeline", "run", "hdx", "--incremental"],
          actor: "pablo@laptop",
          codeVersion: "the-cli-commit",
        }),
        requestBody: { incremental: true },
        host: "fly-machine",
        codeVersion: "server-commit",
      }),
    ).toEqual({
      invokedVia: "cli_server",
      cliArgv: ["pipeline", "run", "hdx", "--incremental"],
      actor: "pablo@laptop",
      requestBody: { incremental: true },
      host: "fly-machine",
      codeVersion: "server-commit",
    });
  });

  it.each([
    ["no header", undefined],
    ["a header that is not JSON", "not json"],
    [
      "a header whose argv is not a list of strings",
      JSON.stringify({ cliArgv: [1] }),
    ],
  ])("records any other caller as http, for %s", (_label, header) => {
    expect(
      buildServerRunInvocation({
        invocationHeader: header,
        requestBody: {},
        host: "fly-machine",
        codeVersion: undefined,
      }),
    ).toEqual({
      invokedVia: "http",
      requestBody: {},
      host: "fly-machine",
    });
  });
});
