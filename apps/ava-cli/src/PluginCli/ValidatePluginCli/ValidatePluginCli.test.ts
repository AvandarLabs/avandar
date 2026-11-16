import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { makePluginScaffoldFilesFromName } from "@ava-cli/PluginCli/InitPluginCli/makePluginScaffoldFilesFromName";
import {
  runValidatePluginCli,
  validatePluginCommand,
} from "@ava-cli/PluginCli/ValidatePluginCli/ValidatePluginCli";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let repoRoot: string;

function _getLoggedLines(): string[] {
  const logCalls = (
    Acclimate.log as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls;
  return logCalls.map((call) => {
    return String(call[0]);
  });
}

function _writeRepoFile(path: string, contents: string): void {
  const filePath = join(repoRoot, path);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

// A plugin folder the manifest check accepts: the scaffold plus the Tabler
// icon files its manifest names.
function _writeValidPlugin(name: string): void {
  Object.entries(
    makePluginScaffoldFilesFromName({ name, publisher: "avandar" }),
  ).forEach(([path, contents]) => {
    _writeRepoFile(`plugins/${name}/${path}`, contents);
  });
}

function _writeBundledList(names: string[]): void {
  _writeRepoFile(
    "plugins/bundled.yaml",
    `plugins:\n${names
      .map((name) => {
        return `  - ${name}\n`;
      })
      .join("")}`,
  );
}

function _makePassingRunCommand() {
  return vi.fn().mockReturnValue({ isOk: true, output: "" });
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugin-validate-"));
  ["IconPuzzle", "IconHandStop"].forEach((iconName) => {
    _writeRepoFile(
      `node_modules/@tabler/icons-react/dist/esm/icons/${iconName}.mjs`,
      "",
    );
  });
  vi.spyOn(Acclimate, "log").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("validatePluginCommand", () => {
  it("runs tsc and eslint on the named plugin and reports it valid", () => {
    _writeValidPlugin("case-tools");
    const runCommand = _makePassingRunCommand();
    validatePluginCommand({ name: "case-tools", repoRoot, runCommand });
    expect(runCommand).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "tsc", "-p", "plugins/case-tools/tsconfig.json", "--noEmit"],
      repoRoot,
    );
    expect(runCommand).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "eslint", "plugins/case-tools"],
      repoRoot,
    );
    expect(_getLoggedLines().join("\n")).toContain(
      "plugins/case-tools is valid.",
    );
  });

  it("validates every bundled plugin when no name is given", () => {
    _writeValidPlugin("case-tools");
    _writeValidPlugin("lab-tools");
    _writeBundledList(["case-tools", "lab-tools"]);
    const runCommand = _makePassingRunCommand();
    validatePluginCommand({ repoRoot, runCommand });
    const eslintTargets = runCommand.mock.calls
      .filter(([, args]) => {
        return args[1] === "eslint";
      })
      .map(([, args]) => {
        return args[2];
      });
    expect(eslintTargets).toEqual(["plugins/case-tools", "plugins/lab-tools"]);
  });

  it("warns and passes when no plugin is bundled", () => {
    const runCommand = _makePassingRunCommand();
    validatePluginCommand({ repoRoot, runCommand });
    expect(runCommand).not.toHaveBeenCalled();
    expect(_getLoggedLines().join("\n")).toContain("No bundled plugins");
  });

  it("throws and prints the tool output when tsc fails", () => {
    _writeValidPlugin("case-tools");
    const runCommand = vi.fn().mockImplementation((_command, args) => {
      return args[1] === "tsc"
        ? { isOk: false, output: "index.tsx(1,1): error TS2322" }
        : { isOk: true, output: "" };
    });
    expect(() => {
      return validatePluginCommand({
        name: "case-tools",
        repoRoot,
        runCommand,
      });
    }).toThrow(/1 plugin failed validation/);
    const output = _getLoggedLines().join("\n");
    expect(output).toContain("plugins/case-tools failed validation");
    expect(output).toContain("error TS2322");
  });

  it("counts every failing plugin when several fail", () => {
    _writeValidPlugin("case-tools");
    _writeValidPlugin("lab-tools");
    _writeBundledList(["case-tools", "lab-tools"]);
    const runCommand = vi.fn().mockReturnValue({ isOk: false, output: "bad" });
    expect(() => {
      return validatePluginCommand({ repoRoot, runCommand });
    }).toThrow(/2 plugins failed validation/);
  });

  it("lists the manifest problems and skips tsc and eslint when the manifest is invalid", () => {
    _writeBundledList(["case-tools"]);
    const runCommand = _makePassingRunCommand();
    expect(() => {
      return validatePluginCommand({ repoRoot, runCommand });
    }).toThrow(/1 plugin failed validation/);
    expect(runCommand).not.toHaveBeenCalled();
    expect(_getLoggedLines().join("\n")).toContain("ava.yaml not found");
  });

  it("refuses a name that is not kebab-case before running anything", () => {
    const runCommand = _makePassingRunCommand();
    expect(() => {
      return validatePluginCommand({ name: "../escape", repoRoot, runCommand });
    }).toThrow(/kebab-case/);
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe("runValidatePluginCli", () => {
  it("prints usage with examples and runs nothing when help is requested", async () => {
    const runCommand = _makePassingRunCommand();
    await runValidatePluginCli({
      name: "case-tools",
      help: true,
      isInteractive: false,
      repoRoot,
      runCommand,
    });
    const output = _getLoggedLines().join("\n");
    expect(output).toContain("ava plugin validate [name]");
    expect(output).toContain("Examples");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("asks which plugin to validate when run bare in a terminal", async () => {
    _writeValidPlugin("case-tools");
    _writeValidPlugin("lab-tools");
    _writeBundledList(["case-tools", "lab-tools"]);
    vi.spyOn(Acclimate, "requestInput").mockResolvedValueOnce("lab-tools");
    const runCommand = _makePassingRunCommand();
    await runValidatePluginCli({ isInteractive: true, repoRoot, runCommand });
    const eslintTargets = runCommand.mock.calls
      .filter(([, args]) => {
        return args[1] === "eslint";
      })
      .map(([, args]) => {
        return args[2];
      });
    expect(eslintTargets).toEqual(["plugins/lab-tools"]);
  });

  it("validates every bundled plugin when the prompt is left empty", async () => {
    _writeValidPlugin("case-tools");
    _writeValidPlugin("lab-tools");
    _writeBundledList(["case-tools", "lab-tools"]);
    vi.spyOn(Acclimate, "requestInput").mockResolvedValueOnce(undefined);
    const runCommand = _makePassingRunCommand();
    await runValidatePluginCli({ isInteractive: true, repoRoot, runCommand });
    expect(runCommand).toHaveBeenCalledTimes(4);
  });

  it("does not prompt without a terminal", async () => {
    const requestInput = vi.spyOn(Acclimate, "requestInput");
    await runValidatePluginCli({
      isInteractive: false,
      repoRoot,
      runCommand: _makePassingRunCommand(),
    });
    expect(requestInput).not.toHaveBeenCalled();
  });

  it("sets a nonzero exit code and explains the fix when a plugin fails", async () => {
    _writeValidPlugin("case-tools");
    await runValidatePluginCli({
      name: "case-tools",
      isInteractive: false,
      repoRoot,
      runCommand: vi.fn().mockReturnValue({ isOk: false, output: "bad" }),
    });
    expect(process.exitCode).toBe(1);
    expect(_getLoggedLines().join("\n")).toContain(
      "❌ ava plugin validate: 1 plugin failed validation.",
    );
  });
});
