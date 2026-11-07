import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initPluginCommand,
  runInitPluginCli,
} from "@ava-cli/PluginCli/InitPluginCli/InitPluginCli";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BUNDLED_HEADER = "# Bundled plugins.\n";

let repoRoot: string;

function _readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function _writeBundledList(text: string): void {
  writeFileSync(join(repoRoot, "plugins/bundled.yaml"), text);
}

function _getLoggedLines(): string[] {
  const logCalls = (
    Acclimate.log as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls;
  return logCalls.map((call) => {
    return String(call[0]);
  });
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugin-init-"));
  mkdirSync(join(repoRoot, "plugins"));
  _writeBundledList(`${BUNDLED_HEADER}plugins: []\n`);
  vi.spyOn(Acclimate, "log").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("initPluginCommand", () => {
  it("writes a plugin folder whose manifest id is publisher.name", () => {
    initPluginCommand({ name: "case-tools", publisher: "acme", repoRoot });
    expect(_readRepoFile("plugins/case-tools/ava.yaml")).toContain(
      "id: acme.case-tools",
    );
    expect(_readRepoFile("plugins/case-tools/package.json")).toContain(
      '"name": "@avandar-plugins/case-tools"',
    );
    expect(_readRepoFile("plugins/case-tools/locales/en.json")).toContain(
      '"plugin.name": "Case Tools"',
    );
    expect(existsSync(join(repoRoot, "plugins/case-tools/src/index.tsx"))).toBe(
      true,
    );
  });

  it("appends the plugin to bundled.yaml and keeps comments and order", () => {
    _writeBundledList(
      `${BUNDLED_HEADER}# Order matters.\nplugins:\n  # First.\n  - epidemiology\n`,
    );
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toBe(
      `${BUNDLED_HEADER}# Order matters.\nplugins:\n  # First.\n  - epidemiology\n  - case-tools\n`,
    );
  });

  it("writes the first entry as a block list when bundled.yaml listed none", () => {
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toBe(
      `${BUNDLED_HEADER}plugins:\n  - case-tools\n`,
    );
  });

  it("adds the entry when the plugins key is empty", () => {
    _writeBundledList(`${BUNDLED_HEADER}plugins:\n`);
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toContain("- case-tools");
  });

  it("adds a plugins list below the comments when bundled.yaml holds only comments", () => {
    _writeBundledList(BUNDLED_HEADER);
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toBe(
      `${BUNDLED_HEADER}plugins:\n  - case-tools\n`,
    );
  });

  it("refuses a bundled.yaml whose root is not a map", () => {
    _writeBundledList("- case-tools\n");
    expect(() => {
      return initPluginCommand({
        name: "lab-tools",
        publisher: "avandar",
        repoRoot,
      });
    }).toThrow(/must be a map/);
    expect(existsSync(join(repoRoot, "plugins/lab-tools"))).toBe(false);
  });

  it("creates bundled.yaml when it does not exist", () => {
    rmSync(join(repoRoot, "plugins/bundled.yaml"));
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toContain("- case-tools");
  });

  it("lists the plugin once when bundled.yaml already names it", () => {
    _writeBundledList(`${BUNDLED_HEADER}plugins:\n  - case-tools\n`);
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(_readRepoFile("plugins/bundled.yaml")).toBe(
      `${BUNDLED_HEADER}plugins:\n  - case-tools\n`,
    );
    expect(existsSync(join(repoRoot, "plugins/case-tools/ava.yaml"))).toBe(
      true,
    );
  });

  it("refuses a name that is not kebab-case and writes nothing", () => {
    expect(() => {
      return initPluginCommand({
        name: "CaseTools",
        publisher: "avandar",
        repoRoot,
      });
    }).toThrow(/kebab-case/);
    expect(existsSync(join(repoRoot, "plugins/CaseTools"))).toBe(false);
  });

  it("refuses a publisher that is not kebab-case", () => {
    expect(() => {
      return initPluginCommand({
        name: "case-tools",
        publisher: "Acme Inc",
        repoRoot,
      });
    }).toThrow(/kebab-case/);
  });

  it("refuses to overwrite an existing plugin and keeps its files", () => {
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    writeFileSync(join(repoRoot, "plugins/case-tools/ava.yaml"), "edited\n");
    expect(() => {
      return initPluginCommand({
        name: "case-tools",
        publisher: "avandar",
        repoRoot,
      });
    }).toThrow(/already exists/);
    expect(_readRepoFile("plugins/case-tools/ava.yaml")).toBe("edited\n");
  });

  it("writes no plugin folder when bundled.yaml is not valid YAML", () => {
    _writeBundledList("plugins: [unclosed\n");
    expect(() => {
      return initPluginCommand({
        name: "case-tools",
        publisher: "avandar",
        repoRoot,
      });
    }).toThrow(/bundled\.yaml/);
    expect(existsSync(join(repoRoot, "plugins/case-tools"))).toBe(false);
  });
});

describe("runInitPluginCli", () => {
  it("prints usage with examples and writes nothing when help is requested", async () => {
    await runInitPluginCli({
      name: "case-tools",
      help: true,
      isInteractive: false,
      repoRoot,
    });
    const output = _getLoggedLines().join("\n");
    expect(output).toContain(
      "ava plugin init [name] [--publisher <publisher>]",
    );
    expect(output).toContain("Examples");
    expect(existsSync(join(repoRoot, "plugins/case-tools"))).toBe(false);
  });

  it("asks for the name and the publisher when run bare in a terminal", async () => {
    const requestInput = vi
      .spyOn(Acclimate, "requestInput")
      .mockResolvedValueOnce("case-tools")
      .mockResolvedValueOnce("acme");
    await runInitPluginCli({ isInteractive: true, repoRoot });
    expect(requestInput).toHaveBeenCalledTimes(2);
    expect(_readRepoFile("plugins/case-tools/ava.yaml")).toContain(
      "id: acme.case-tools",
    );
  });

  it("offers the default publisher in the prompt", async () => {
    const requestInput = vi
      .spyOn(Acclimate, "requestInput")
      .mockResolvedValueOnce("case-tools")
      .mockResolvedValueOnce("avandar");
    await runInitPluginCli({ isInteractive: true, repoRoot });
    expect(requestInput.mock.calls[1]?.[0].responseOptions.defaultValue).toBe(
      "avandar",
    );
  });

  it("does not prompt when the name is given", async () => {
    const requestInput = vi.spyOn(Acclimate, "requestInput");
    await runInitPluginCli({
      name: "case-tools",
      isInteractive: true,
      repoRoot,
    });
    expect(requestInput).not.toHaveBeenCalled();
    expect(_readRepoFile("plugins/case-tools/ava.yaml")).toContain(
      "id: avandar.case-tools",
    );
  });

  it("fails with the exact invocation to try when there is no terminal to ask", async () => {
    const requestInput = vi.spyOn(Acclimate, "requestInput");
    await runInitPluginCli({ isInteractive: false, repoRoot });
    expect(requestInput).not.toHaveBeenCalled();
    expect(_getLoggedLines().join("\n")).toContain(
      "ava plugin init <name> [--publisher <publisher>]",
    );
    expect(process.exitCode).toBe(1);
  });
});
