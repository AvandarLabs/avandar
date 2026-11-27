import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createCoverageDirectory as _createDirectory } from "../../__tests__/coverage.fixtures";
import { createNativeRepository } from "../../__tests__/nativeProof.fixtures";
import { runCli, runCoverageWizard } from "../cliHelpers";
import type { PromptIo } from "@avandar/acclimate";

function _createScriptedPromptIo(
  options: Readonly<{
    isRawModeSupported?: boolean;
    onWrite?: (chunk: string, input: PassThrough) => void;
    onClose?: () => void;
  }> = {},
): {
  promptIo: PromptIo;
  input: PassThrough;
  output: string[];
} {
  const input = new PassThrough();
  const output: string[] = [];
  const rawInput = Object.assign(input, {
    isTTY: options.isRawModeSupported ?? true,
    isRaw: false,
    setRawMode: (mode: boolean) => {
      rawInput.isRaw = mode;
    },
  });
  return {
    input,
    output,
    promptIo: {
      input: rawInput,
      output: {
        isTTY: true,
        write: (chunk: string) => {
          output.push(chunk);
          options.onWrite?.(chunk, input);
        },
      },
      isColorEnabled: false,
      isRawModeSupported: options.isRawModeSupported ?? true,
      close: () => {
        options.onClose?.();
      },
    },
  };
}

/** CLI contracts verify Acclimate parsing, prompts, streams, and exits. */
describe("coverage CLI", () => {
  it.each([
    ["j", "j\r", "agent"],
    ["k", "k\r", "json"],
    ["down wrap", "jjj\r", "stylish"],
    ["up wrap", "\u001b[A\r", "json"],
    ["g", "jkg\r", "stylish"],
    ["G", "G\r", "json"],
  ])(
    "navigates the wizard format menu with %s to select %s",
    async (_label, menuKeys, expectedFormat) => {
      let stage = 0;
      const { promptIo, output } = _createScriptedPromptIo({
        onWrite: (_chunk, input) => {
          const combined = output.join("");
          if (stage === 0 && combined.includes("Paths (comma-separated)")) {
            stage = 1;
            queueMicrotask(() => {
              input.write("\n");
            });
          } else if (stage === 1 && combined.includes("Format")) {
            stage = 2;
            queueMicrotask(() => {
              input.write(menuKeys);
            });
          }
        },
      });
      const result = await runCoverageWizard({ promptIo, interactive: true });
      expect(output.join("")).toContain("Paths (comma-separated)");
      expect(output.join("")).toContain("[default: .]");
      expect(output.join("")).toContain("Format");
      expect(result).toEqual({ paths: ["."], format: expectedFormat });
    },
  );

  it.each([
    [
      "Ctrl-C",
      (input: PassThrough) => {
        return input.write("\u0003");
      },
    ],
    [
      "EOF",
      (input: PassThrough) => {
        return input.end();
      },
    ],
  ])(
    "cancels the wizard on %s before coverage runs",
    async (_label, trigger) => {
      let didSend = false;
      const { promptIo, output } = _createScriptedPromptIo({
        onWrite: (_chunk, input) => {
          if (!didSend && output.join("").includes("Paths (comma-separated)")) {
            didSend = true;
            queueMicrotask(() => {
              trigger(input);
            });
          }
        },
      });
      await expect(
        runCoverageWizard({ promptIo, interactive: true }),
      ).rejects.toMatchObject({ code: "prompt_cancelled" });
    },
  );

  it("prints help outside a repository before invalid arguments or coverage access", async () => {
    const stdout: string[] = [];
    const status = await runCli({
      args: ["coverage", "--invalid", "--help"],
      io: {
        cwd: "/missing/repository",
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: () => {
          throw new Error("unexpected diagnostics");
        },
      },
    });
    expect(status).toBe(0);
    expect(stdout.join("")).toContain("--format stylish|agent|json");
    expect(stdout.join("")).toContain("Examples");
  });

  it("keeps explicit JSON stdout parseable with interleaved variadic paths and emits progress on stderr", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "first.json"), "{}");
    writeFileSync(join(directory, "second.json"), "{}");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const status = await runCli({
      args: [
        "coverage",
        "--format",
        "json",
        "first.json",
        "--no-prompt",
        "second.json",
      ],
      io: {
        cwd: directory,
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: (value) => {
          stderr.push(value);
        },
        openTty: async () => {
          throw new Error("explicit values must not prompt");
        },
      },
    });
    expect(status).toBe(0);
    const parsed = JSON.parse(stdout.join(""));
    expect(parsed.outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: join(directory, "first.json") }),
        expect.objectContaining({ path: join(directory, "second.json") }),
      ]),
    );
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
          stdout.push(value);
        },
        stderr: () => {},
        interactive: false,
      },
    });
    expect(status).toBe(0);
    expect(stdout.join("")).toContain("not-applicable");
  });

  it("prompts only for a missing format and preserves the explicit path", async () => {
    const directory = _createDirectory();
    writeFileSync(join(directory, "data.json"), "{}");
    const stdout: string[] = [];
    let hasClosed = false;
    let didSelect = false;
    const { promptIo, output } = _createScriptedPromptIo({
      onWrite: (_chunk, input) => {
        if (!didSelect && output.join("").includes("Format")) {
          didSelect = true;
          queueMicrotask(() => {
            input.write("\u001b[A\r");
          });
        }
      },
      onClose: () => {
        hasClosed = true;
      },
    });
    const status = await runCli({
      args: ["coverage", "data.json", "--format"],
      io: {
        cwd: directory,
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: () => {},
        promptIo,
        interactive: true,
      },
    });
    expect(status).toBe(0);
    expect(output.join("")).not.toContain("Paths (comma-separated)");
    expect(output.join("")).toContain("Format");
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
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: (value) => {
          stderr.push(value);
        },
        openTty: async () => {
          throw new Error("Unattended invocations must not prompt");
        },
      },
    });
    expect(status).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("--format");
    expect(stderr.join("")).toContain("Examples");
  });

  it.each([
    ["invalid format choice", ["coverage", "--format", "xml"]],
    ["unknown flag", ["coverage", "--unknown-flag"]],
  ])(
    "rejects %s with full usage and recovery guidance on stderr",
    async (_label, args) => {
      const stdout: string[] = [];
      const stderr: string[] = [];
      expect(
        await runCli({
          args,
          io: {
            stdout: (value) => {
              stdout.push(value);
            },
            stderr: (value) => {
              stderr.push(value);
            },
          },
        }),
      ).toBe(1);
      expect(stdout).toEqual([]);
      expect(stderr.join("")).toContain("  ⚠️");
      expect(stderr.join("")).toContain("Examples");
    },
  );

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
          stdout: (value) => {
            stdout.push(value);
          },
          stderr: (value) => {
            stderr.push(value);
          },
        },
      });
      expect(status).toBe(1);
      expect(JSON.parse(stdout.join("")).operational).toBe(false);
      expect(stderr.join("")).toContain("engine-fixture-failure");
      expect(stderr.join("")).toContain("exit 2");
    },
    15000,
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
  expect(result.stdout).toContain("Usage");
  expect(result.stdout).toContain("avandar-lint coverage");
});
