import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createCoverageDirectory as _createDirectory } from "../../__tests__/coverage.fixtures";
import { createNativeRepository } from "../../__tests__/nativeProof.fixtures";
import {
  getMenuSelectionFromKey,
  runCli,
  runCoverageWizard,
} from "../cliHelpers";

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
    expect(
      getMenuSelectionFromKey({ key: key, selected: selected, numChoices: 3 }),
    ).toBe(expected);
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
    const status = await runCli({
      args: ["coverage", "--invalid", "--help"],
      io: {
        cwd: "/missing/repository",
        stdout: (value) => {
          return stdout.push(value);
        },
        stderr: () => {
          throw new Error("unexpected diagnostics");
        },
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
    const status = await runCli({
      args: ["coverage", "data.json", "--format", "json", "--no-prompt"],
      io: {
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
    });
    expect(status).toBe(0);
    expect(JSON.parse(stdout.join("")).outcomes.length).toBeGreaterThan(0);
    expect(stderr.join("")).toContain("Checking coverage");
  });

  it("uses current-directory stylish defaults unattended", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "data.json"), "{}");
    const stdout: string[] = [];
    const status = await runCli({
      args: ["coverage"],
      io: {
        cwd: directory,
        stdout: (value) => {
          return stdout.push(value);
        },
        stderr: () => {},
        terminal: () => {
          return undefined;
        },
      },
    });
    expect(status).toBe(0);
    expect(stdout.join("")).toContain("not-applicable");
  });

  it("prompts only for a missing format and preserves the explicit path", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "data.json"), "{}");
    const stdout: string[] = [];
    const prompts: string[] = [];
    let hasClosed = false;
    const status = await runCli({
      args: ["coverage", "data.json", "--format"],
      io: {
        cwd: directory,
        stdout: (value: string): void => {
          stdout.push(value);
        },
        stderr: (): void => {},
        terminal: () => {
          return {
            ask: async (): Promise<string> => {
              throw new Error("The explicit path must not be prompted again");
            },
            choose: async (label: string): Promise<number> => {
              prompts.push(label);
              return 2;
            },
            close: (): void => {
              hasClosed = true;
            },
          };
        },
      },
    });
    expect(status).toBe(0);
    expect(prompts).toEqual(["Format"]);
    expect(hasClosed).toBe(true);
    expect(JSON.parse(stdout.join("")).outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: join(directory, "data.json") }),
      ]),
    );
  });

  it("fails a missing format without prompting when unattended", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const status = await runCli({
      args: ["coverage", "--format", "--no-prompt"],
      io: {
        stdout: (value: string): void => {
          stdout.push(value);
        },
        stderr: (value: string): void => {
          stderr.push(value);
        },
        terminal: () => {
          throw new Error("Unattended invocations must not prompt");
        },
      },
    });
    expect(status).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("--format");
    expect(stderr.join("")).toContain("Examples:");
  });

  it("rejects invalid invocations with full usage and recovery guidance on stderr", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    expect(
      await runCli({
        args: ["coverage", "--format", "xml"],
        io: {
          stdout: (value) => {
            return stdout.push(value);
          },
          stderr: (value) => {
            return stderr.push(value);
          },
        },
      }),
    ).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("  ⚠️");
    expect(stderr.join("")).toContain("Examples:");
  });

  it.each(["listing", "proof"])(
    "retains the native %s failure reason on stderr while keeping JSON parseable",
    async (failureStage: string) => {
      const directory = createNativeRepository(
        'process.stderr.write("engine-fixture-failure"); status = 2;',
      );
      if (failureStage === "listing") {
        writeFileSync(
          join(directory, "node_modules/.bin/oxlint"),
          '#!/usr/bin/env node\nprocess.stderr.write("engine-fixture-failure"); process.exit(2);\n',
          { mode: 0o755 },
        );
      }
      const stdout: string[] = [];
      const stderr: string[] = [];
      const status = await runCli({
        args: [
          "coverage",
          "src/reviewed.tsx",
          "--format",
          "json",
          "--no-prompt",
        ],
        io: {
          cwd: directory,
          stdout: (value: string): void => {
            stdout.push(value);
          },
          stderr: (value: string): void => {
            stderr.push(value);
          },
        },
      });
      expect(status).toBe(1);
      expect(JSON.parse(stdout.join("")).operational).toBe(false);
      expect(stderr.join("")).toContain("engine-fixture-failure");
      expect(stderr.join("")).toContain("exit 2");
    },
  );
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
