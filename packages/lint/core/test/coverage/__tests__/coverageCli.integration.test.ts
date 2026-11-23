import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  runCli,
  getMenuSelection,
  runCoverageWizard,
} from "../../../src/cli/main";
import { createCoverageDirectory as _createDirectory } from "./coverage.fixtures";

/** Wizard contracts are independent of terminal drawing and filesystem IO. */
describe("coverage CLI", () => {
  it.each([
    ["j", 0, 1],
    ["k", 0, 2],
    ["down", 2, 0],
    ["up", 0, 2],
    ["g", 2, 0],
    ["G", 0, 2],
  ])("moves %s from %i to %i", (key, selected, expected) => {
    expect(getMenuSelection(key, selected, 3)).toBe(expected);
  });

  it("offers every optional field and visible default in the bare wizard", async () => {
    const prompts: string[] = [];
    const result = await runCoverageWizard({
      ask: async (label, defaultValue) => {
        prompts.push(`${label}: ${defaultValue}`);
        return "";
      },
      choose: async (label, values, selected) => {
        prompts.push(`${label}: ${values.join("|")}: ${selected}`);
        return selected;
      },
    });
    expect(prompts).toEqual([
      "Paths (comma-separated): .",
      "Format: stylish|agent|json: 0",
    ]);
    expect(result).toEqual({ paths: ["."], format: "stylish" });
  });

  it.each(["Ctrl-C", "EOF"])(
    "cancels the wizard on %s before coverage runs",
    async (reason) => {
      await expect(
        runCoverageWizard({
          ask: async () => {
            throw new Error(reason);
          },
          choose: async () => {
            return 0;
          },
        }),
      ).rejects.toThrow(reason);
    },
  );

  it("prints help outside a repository before invalid arguments or coverage access", async () => {
    const stdout: string[] = [];
    const status = await runCli(["coverage", "--invalid", "--help"], {
      cwd: "/missing/repository",
      stdout: (value) => {
        return stdout.push(value);
      },
      stderr: () => {
        throw new Error("unexpected diagnostics");
      },
    });
    expect(status).toBe(0);
    expect(stdout.join("")).toContain("--format stylish|agent|json");
    expect(stdout.join("")).toContain("Examples:");
  });

  it("keeps explicit JSON stdout parseable and emits progress on stderr", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "data.json"), "{}");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const status = await runCli(
      ["coverage", "data.json", "--format", "json", "--no-prompt"],
      {
        cwd: directory,
        stdout: (value) => {
          return stdout.push(value);
        },
        stderr: (value) => {
          return stderr.push(value);
        },
        terminal: () => {
          throw new Error("explicit values must not prompt");
        },
      },
    );
    expect(status).toBe(0);
    expect(JSON.parse(stdout.join("")).outcomes.length).toBeGreaterThan(0);
    expect(stderr.join("")).toContain("Checking coverage");
  });

  it("uses current-directory stylish defaults unattended", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "data.json"), "{}");
    const stdout: string[] = [];
    const status = await runCli(["coverage"], {
      cwd: directory,
      stdout: (value) => {
        return stdout.push(value);
      },
      stderr: () => {},
      terminal: () => {
        return undefined;
      },
    });
    expect(status).toBe(0);
    expect(stdout.join("")).toContain("not-applicable");
  });

  it("rejects invalid invocations with full usage and recovery guidance on stderr", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    expect(
      await runCli(["coverage", "--format", "xml"], {
        stdout: (value) => {
          return stdout.push(value);
        },
        stderr: (value) => {
          return stderr.push(value);
        },
      }),
    ).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("  ⚠️");
    expect(stderr.join("")).toContain("Examples:");
  });
});

it("prints coverage help through the installed workspace binary", () => {
  const result = spawnSync(
    resolve(
      import.meta.dirname,
      "../../../../../../node_modules/.bin/avandar-lint",
    ),
    ["coverage", "--help"],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Usage: avandar-lint");
});
