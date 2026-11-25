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

// A plugin folder with no entry that only bundles one content file, so it
// has no code for tsc or oxlint to check.
function _writeContentOnlyPlugin(name: string): void {
  _writeRepoFile(
    `plugins/${name}/ava.yaml`,
    [
      `id: avandar.${name}`,
      'name: "%plugin.name%"',
      'description: "%plugin.description%"',
      'version: "0.1.0"',
      "license: MIT",
      "engines:",
      '  avandar: "^1"',
      "icon: puzzle",
      "contributes:",
      "  content:",
      "    - id: provinces",
      "      kind: dataset",
      '      title: "%content.provinces.title%"',
      '      description: "%content.provinces.description%"',
      "      file: content/provinces.csv",
      "",
    ].join("\n"),
  );
  _writeRepoFile(
    `plugins/${name}/locales/en.json`,
    JSON.stringify({
      "plugin.name": "Boundaries",
      "plugin.description": "Province boundaries.",
      "content.provinces.title": "Provinces",
      "content.provinces.description": "Province boundaries.",
    }),
  );
  _writeRepoFile(`plugins/${name}/content/provinces.csv`, "code,name\n");
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
  it("runs tsc and oxlint on the named plugin and reports it valid", () => {
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
      [
        "exec",
        "oxlint",
        "--report-unused-disable-directives-severity=error",
        "plugins/case-tools",
      ],
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
    const oxlintTargets = runCommand.mock.calls
      .filter(([, args]) => {
        return args[1] === "oxlint";
      })
      .map(([, args]) => {
        return args.at(-1);
      });
    expect(oxlintTargets).toEqual(["plugins/case-tools", "plugins/lab-tools"]);
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

  it("throws and prints the tool output when oxlint fails", () => {
    _writeValidPlugin("case-tools");
    const runCommand = vi.fn().mockImplementation((_command, args) => {
      return args[1] === "oxlint"
        ? { isOk: false, output: "plugin-restrictions(no-restricted-imports)" }
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
    expect(output).toContain(
      "oxlint:\nplugin-restrictions(no-restricted-imports)",
    );
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

  it("lists the manifest problems and skips tsc and oxlint when the manifest is invalid", () => {
    _writeBundledList(["case-tools"]);
    const runCommand = _makePassingRunCommand();
    expect(() => {
      return validatePluginCommand({ repoRoot, runCommand });
    }).toThrow(/1 plugin failed validation/);
    expect(runCommand).not.toHaveBeenCalled();
    const output = _getLoggedLines().join("\n");
    expect(output).toContain("ava.yaml not found");
    expect(output).toContain("Skipped tsc and oxlint");
  });

  it("skips tsc and oxlint for a plugin with no code and reports it valid", () => {
    _writeContentOnlyPlugin("boundaries");
    const runCommand = _makePassingRunCommand();
    validatePluginCommand({ name: "boundaries", repoRoot, runCommand });
    expect(runCommand).not.toHaveBeenCalled();
    const output = _getLoggedLines().join("\n");
    expect(output).toContain("No plugin code, skipping tsc and oxlint.");
    expect(output).toContain("plugins/boundaries is valid.");
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
    const oxlintTargets = runCommand.mock.calls
      .filter(([, args]) => {
        return args[1] === "oxlint";
      })
      .map(([, args]) => {
        return args.at(-1);
      });
    expect(oxlintTargets).toEqual(["plugins/lab-tools"]);
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
