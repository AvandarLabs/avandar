import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRuleCatalog } from "../src/catalog/index";
import {
  collectCoverage,
  summarizeCoverage,
  type CoverageProbe,
} from "../src/cli/coverage";
import { runCli, getMenuSelection, runCoverageWizard } from "../src/cli/main";

const directories: string[] = [];
afterEach(() => {
  return directories.splice(0).forEach((directory) => {
    return rmSync(directory, { recursive: true, force: true });
  });
});
function _createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "avandar-coverage-"));
  directories.push(directory);
  return directory;
}
const rule = loadRuleCatalog().rules.find((entry) => {
  return entry.id === "AF-01";
})!;
const catalog = {
  version: 1 as const,
  languages: ["typescript", "json"],
  rules: [rule],
};

/** Coverage claims require engine evidence for every file and capability. */
describe("coverage", () => {
  it("enforces an enabled seeded rule only after the real engine reports its violation", async () => {
    const directory = _createDirectory();
    writeFileSync(
      join(directory, ".oxlintrc.json"),
      JSON.stringify({
        categories: { correctness: "off" },
        rules: { curly: "error" },
      }),
    );
    writeFileSync(
      join(directory, "seed.ts"),
      "if (true) console.log('seed');\n",
    );
    const probe: CoverageProbe = {
      ruleId: "AF-01",
      language: "typescript",
      capability: "if-body",
      prove: async () => {
        const result = spawnSync(
          resolve(import.meta.dirname, "../../../../node_modules/.bin/oxlint"),
          [
            "--config",
            join(directory, ".oxlintrc.json"),
            "--format",
            "json",
            join(directory, "seed.ts"),
          ],
          { encoding: "utf8" },
        );
        const diagnostics = JSON.parse(result.stdout).diagnostics;
        return {
          available: true,
          enabled: true,
          included: true,
          operational: !result.error,
          exitCode: result.status ?? 0,
          diagnosticRuleIds: diagnostics.some(
            (diagnostic: { code: string }) => {
              return diagnostic.code.includes("curly");
            },
          )
            ? ["AF-01"]
            : [],
        };
      },
    };
    const result = await collectCoverage({
      catalog,
      paths: [join(directory, "seed.ts")],
      probes: [probe],
    });
    expect(result.outcomes[0]).toMatchObject({
      state: "enforced",
      capability: "if-body",
    });
  });

  it.each([
    "disabled",
    "missing-plugin",
    "excluded",
    "operational",
    "unproven",
  ])("falls back when evidence is %s", async (reason) => {
    const directory = _createDirectory();
    const path = join(directory, "seed.ts");
    writeFileSync(path, "export {};\n");
    const result = await collectCoverage({
      catalog,
      paths: [path],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            return {
              available: reason !== "missing-plugin",
              enabled: reason !== "disabled",
              included: reason !== "excluded",
              operational: reason !== "operational",
              exitCode: reason === "unproven" ? 0 : 1,
              diagnosticRuleIds: ["AF-01"],
            };
          },
        },
      ],
    });
    expect(result.outcomes[0]?.state).toBe("fallback");
    expect(result.outcomes[0]?.recovery).toMatch(
      /Run|Enable|Install|Include|Verify/,
    );
  });

  it("keeps a language summary in fallback for mixed capabilities", async () => {
    const directory = _createDirectory();
    const paths = ["supported.ts", "unsupported.ts"].map((name) => {
      return join(directory, name);
    });
    paths.forEach((path) => {
      return writeFileSync(path, "export {};\n");
    });
    const result = await collectCoverage({
      catalog,
      paths,
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "supported-framework",
          prove: async ({ path }) => {
            return {
              available: true,
              enabled: true,
              included: true,
              operational: true,
              exitCode: 1,
              diagnosticRuleIds: path.endsWith("unsupported.ts")
                ? []
                : ["AF-01"],
            };
          },
        },
      ],
    });
    expect(
      result.outcomes.map((entry) => {
        return entry.state;
      }),
    ).toEqual(["enforced", "fallback"]);
    expect(summarizeCoverage(result.outcomes)[0]?.state).toBe("fallback");
  });

  it("falls back for unknown languages and reports JSON comment rules as not applicable", async () => {
    const directory = _createDirectory();
    const paths = ["unknown.xyz", "data.json"].map((name) => {
      return join(directory, name);
    });
    paths.forEach((path) => {
      return writeFileSync(path, "{}");
    });
    const result = await collectCoverage({ catalog: loadRuleCatalog(), paths });
    expect(
      result.outcomes.find((entry) => {
        return entry.path.endsWith("unknown.xyz");
      })?.state,
    ).toBe("fallback");
    expect(
      result.outcomes.find((entry) => {
        return entry.path.endsWith("data.json") && entry.ruleId === "GD-01";
      })?.state,
    ).toBe("not-applicable");
  });

  it.each(["md", "po", "map"])(
    "reports fallback for an explicitly reviewed .%s file",
    async (extension) => {
      const directory = _createDirectory();
      const path = join(directory, `reviewed.${extension}`);
      writeFileSync(path, "reviewed content");
      const result = await collectCoverage({ catalog, paths: [path] });
      expect(result.outcomes).toMatchObject([
        { path, language: "unknown", state: "fallback" },
      ]);
      expect(result.summaries).toMatchObject([
        {
          language: "unknown",
          state: "fallback",
          uncovered: [{ path, capability: "all" }],
        },
      ]);
    },
  );

  it("retains unsupported explicit paths beside enforced TypeScript paths", async () => {
    const directory = _createDirectory();
    const supportedPath = join(directory, "supported.ts");
    const unsupportedPath = join(directory, "README.md");
    [supportedPath, unsupportedPath].forEach((path) => {
      writeFileSync(path, "reviewed content");
    });
    const result = await collectCoverage({
      catalog,
      paths: [supportedPath, unsupportedPath],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            return {
              available: true,
              enabled: true,
              included: true,
              operational: true,
              exitCode: 1,
              diagnosticRuleIds: ["AF-01"],
            };
          },
        },
      ],
    });
    expect(result.outcomes).toHaveLength(2);
    expect(
      result.outcomes.find((outcome) => {
        return outcome.path === supportedPath;
      })?.state,
    ).toBe("enforced");
    expect(
      result.outcomes.find((outcome) => {
        return outcome.path === unsupportedPath;
      })?.state,
    ).toBe("fallback");
  });

  it("turns a thrown probe error into an operational fallback", async () => {
    const directory = _createDirectory();
    const path = join(directory, "seed.ts");
    writeFileSync(path, "export {};\n");
    const result = await collectCoverage({
      catalog,
      paths: [path],
      probes: [
        {
          ruleId: "AF-01",
          language: "typescript",
          capability: "if-body",
          prove: async () => {
            throw new Error("broken engine");
          },
        },
      ],
    });
    expect(result.operational).toBe(false);
    expect(result.outcomes[0]?.state).toBe("fallback");
  });
});

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

it("records one cold and five warm samples with their median", async () => {
  const { benchmarkLint } =
    await import("../../../../scripts/lint-benchmark/benchmarkLint.mjs");
  const durations = [900, 60, 10, 40, 20, 30];
  const result = await benchmarkLint({
    label: "fixture",
    runSample: async (index: number) => {
      return { durationMs: durations[index], exitCode: 0 };
    },
  });
  expect(result.coldMs).toBe(900);
  expect(result.warmMs).toEqual([60, 10, 40, 20, 30]);
  expect(result.warmMedianMs).toBe(30);
});

it.each([
  [
    "paste and arrow Enter",
    "fixture.ts\r",
    0,
    '"path":"fixture.ts","format":2',
  ],
  ["Ctrl-C", "\u0003", 1, "Cancelled"],
  ["EOF", "\u0004", 1, "Cancelled"],
] as const)(
  "accepts terminal %s without dropping keys or hanging",
  (_, input, exitCode, expected) => {
    const terminalPath = resolve(import.meta.dirname, "../src/cli/terminal.ts");
    const script = `import {openTerminal} from ${JSON.stringify(terminalPath)}; const prompt=openTerminal(); try { const path=await prompt.ask('Paths','.'); const format=await prompt.choose('Format',['stylish','agent','json'],0); console.log(JSON.stringify({path,format})); } finally {prompt.close();}`;
    const result = spawnSync(
      "python3",
      [
        "-c",
        `
import os, pty, select, sys, time, signal
pid, descriptor = pty.fork()
if pid == 0:
    os.execv(sys.argv[1], [sys.argv[1], '--input-type=module', '-e', sys.argv[2]])
output = b''
stage = 0
deadline = time.time() + 4
while time.time() < deadline:
    if select.select([descriptor], [], [], 0.1)[0]:
        try:
            chunk = os.read(descriptor, 65536)
        except OSError:
            break
        if not chunk:
            break
        output += chunk
        if stage == 0 and b'Paths [default:' in output:
            os.write(descriptor, sys.argv[3].encode())
            stage = 1
        elif stage == 1 and b'Format [default:' in output:
            os.write(descriptor, b'\\x1b[A\\r')
            stage = 2
    child, status = os.waitpid(pid, os.WNOHANG)
    if child:
        print(output.decode(errors='replace'))
        sys.exit(os.waitstatus_to_exitcode(status))
if time.time() >= deadline:
    os.kill(pid, signal.SIGKILL)
    os.waitpid(pid, 0)
    print(output.decode(errors='replace'))
    sys.exit(2)
_, status = os.waitpid(pid, 0)
print(output.decode(errors='replace'))
sys.exit(os.waitstatus_to_exitcode(status))
`,
        process.execPath,
        script,
        input,
      ],
      {
        encoding: "utf8",
        timeout: 6000,
        env: { ...process.env, NO_COLOR: "1" },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(exitCode);
    expect(result.stdout).toContain(expected);
    expect(result.stdout).not.toContain("\u001b[");
  },
);

it("prints coverage help through the installed workspace binary", () => {
  const result = spawnSync(
    resolve(import.meta.dirname, "../../../../node_modules/.bin/avandar-lint"),
    ["coverage", "--help"],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Usage: avandar-lint");
});

it("offers the benchmark label and visible default through its bare wizard", async () => {
  const { getBenchmarkLabel } =
    await import("../../../../scripts/lint-benchmark/benchmarkLint.mjs");
  const questions: string[] = [];
  expect(
    await getBenchmarkLabel([], () => {
      return {
        ask: async (label: string, defaultValue: string) => {
          questions.push(`${label}: ${defaultValue}`);
          return "chosen";
        },
        close: () => {},
      };
    }),
  ).toBe("chosen");
  expect(questions).toEqual(["Label: phase-3-before-package"]);
});
