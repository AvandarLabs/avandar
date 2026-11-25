import { runPluginCommandAction } from "@ava-cli/PluginCli/runPluginCommandAction/runPluginCommandAction";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function _getLoggedLines(): string[] {
  const logCalls = (
    Acclimate.log as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls;
  return logCalls.map((call) => {
    return String(call[0]);
  });
}

beforeEach(() => {
  vi.spyOn(Acclimate, "log").mockImplementation(() => {});
});

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("runPluginCommandAction", () => {
  it("prints the help text and skips the command when help is requested", async () => {
    const run = vi.fn();
    await runPluginCommandAction({
      commandName: "ava plugin init",
      helpText: "HELP TEXT",
      isHelpRequested: true,
      run,
    });
    expect(_getLoggedLines()).toEqual(["HELP TEXT"]);
    expect(run).not.toHaveBeenCalled();
  });

  it("reports a failure as an error line followed by an indented recovery line", async () => {
    await runPluginCommandAction({
      commandName: "ava plugin init",
      helpText: "HELP TEXT",
      isHelpRequested: false,
      run: () => {
        throw new Error("plugins/case-tools already exists.");
      },
    });
    const [errorLine, recoveryLine] = _getLoggedLines();
    expect(errorLine).toContain(
      "❌ ava plugin init: plugins/case-tools already exists.",
    );
    expect(recoveryLine).toMatch(/^\|yellow\| {2}⚠️ /);
    expect(recoveryLine).toContain("ava plugin init --help");
  });

  it("sets a nonzero exit code when the command fails", async () => {
    await runPluginCommandAction({
      commandName: "ava plugin validate",
      helpText: "HELP TEXT",
      isHelpRequested: false,
      run: () => {
        return Promise.reject(new Error("1 plugin failed validation."));
      },
    });
    expect(process.exitCode).toBe(1);
  });

  it("leaves the exit code alone when the command succeeds", async () => {
    await runPluginCommandAction({
      commandName: "ava plugin validate",
      helpText: "HELP TEXT",
      isHelpRequested: false,
      run: () => {},
    });
    expect(process.exitCode).toBeUndefined();
    expect(_getLoggedLines()).toEqual([]);
  });
});
