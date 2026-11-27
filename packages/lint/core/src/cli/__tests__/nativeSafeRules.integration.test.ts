import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((path) => {
    rmSync(path, { recursive: true, force: true });
  });
});

function _writeNativeConfig(directory: string): void {
  const rootConfig = JSON.parse(
    readFileSync(join(ROOT, ".oxlintrc.json"), "utf8"),
  );
  const nativeNames = [
    "curly",
    "prefer-template",
    "typescript/consistent-type-imports",
    "typescript/consistent-type-exports",
    "typescript/prefer-as-const",
    "typescript/no-unnecessary-type-assertion",
  ];
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    JSON.stringify({
      categories: { correctness: "off" },
      plugins: rootConfig.plugins,
      options: rootConfig.options,
      ignorePatterns: ["**/node_modules/**"],
      overrides: rootConfig.overrides.map(
        (override: { files: string[]; rules: Record<string, unknown> }) => {
          return {
            files: override.files,
            rules: Object.fromEntries(
              Object.entries(override.rules).filter(([name]) => {
                return nativeNames.includes(name);
              }),
            ),
          };
        },
      ),
    }),
  );
}

function _createRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "native-coverage-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, ".git"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ scripts: { lint: "oxlint ." } }),
  );
  _writeNativeConfig(directory);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, module: "preserve" },
      include: ["src"],
    }),
  );
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, "src/reviewed.ts"), "export {};\n");
  writeFileSync(join(directory, "src/reviewed.js"), "export {};\n");
  return directory;
}

async function _coverage({
  directory,
  paths = ["src/reviewed.ts"],
  expectedStatus = 0,
}: Readonly<{
  directory: string;
  paths?: string[];
  expectedStatus?: number;
}>): Promise<CoverageReport["outcomes"]> {
  const stdout: string[] = [];
  const code = await runCli({
    args: ["coverage", ...paths, "--format", "json", "--no-prompt"],
    io: {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  });
  const result = JSON.parse(stdout.join(""));
  expect(code).toBe(expectedStatus);
  return result.outcomes.filter((entry: { ruleId: string }) => {
    return [
      "avlint-ts-001",
      "avlint-ts-002",
      "avlint-ts-003",
      "avlint-ts-004",
      "avlint-ts-005",
      "avlint-ts-016",
    ].includes(entry.ruleId);
  });
}

/** Real CLI probes distinguish exact path settings without modifying source. */
it("proves native TS capabilities through the production CLI", async () => {
  const directory = _createRepository();
  const outcomes = await _coverage({ directory: directory });
  expect(
    outcomes.filter((entry: { ruleId: string }) => {
      return entry.ruleId !== "avlint-ts-016";
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ruleId: "avlint-ts-001", state: "enforced" }),
      expect.objectContaining({ ruleId: "avlint-ts-002", state: "fallback" }),
      expect.objectContaining({
        ruleId: "avlint-ts-003",
        capability: "type-imports",
        state: "enforced",
      }),
      expect.objectContaining({
        ruleId: "avlint-ts-003",
        capability: "type-exports",
        state: "enforced",
      }),
      expect.objectContaining({ ruleId: "avlint-ts-004", state: "enforced" }),
      expect.objectContaining({ ruleId: "avlint-ts-005", state: "fallback" }),
    ]),
  );
  expect(
    outcomes.find((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-016";
    })?.state,
  ).toBe("fallback");
  expect(readFileSync(join(directory, "src/reviewed.ts"), "utf8")).toBe(
    "export {};\n",
  );
});

it.each([
  "disabled",
  "excluded",
  "nested",
  "missing-engine",
  "unsupported-command",
])("reports fallback for the exact reviewed path when %s", async (reason) => {
  const directory = _createRepository();
  if (reason === "missing-engine") {
    rmSync(join(directory, "node_modules"));
  } else if (reason === "unsupported-command") {
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ scripts: { lint: "custom-wrapper" } }),
    );
  } else {
    const path = join(
      directory,
      reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json",
    );
    const config =
      reason === "nested" ? {} : JSON.parse(readFileSync(path, "utf8"));
    if (reason === "excluded") {
      config.ignorePatterns = ["**/node_modules/**", "src/reviewed.ts"];
    } else {
      config.rules = { ...config.rules, curly: "off" };
      config.overrides = [];
    }
    writeFileSync(path, JSON.stringify(config));
  }
  const outcomes = await _coverage({ directory: directory });
  expect(
    outcomes.find((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-001";
    })?.state,
  ).toBe("fallback");
});

it("proves JavaScript capabilities independently of TS-only capabilities", async () => {
  const outcomes = await _coverage({
    directory: _createRepository(),
    paths: ["src/reviewed.js"],
  });
  expect(outcomes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: "avlint-ts-001",
        language: "javascript",
        state: "enforced",
      }),
      expect.objectContaining({
        ruleId: "avlint-ts-002",
        language: "javascript",
        state: "fallback",
      }),
      expect.objectContaining({
        ruleId: "avlint-ts-003",
        state: "not-applicable",
      }),
    ]),
  );
});

it("reports an operational fallback for malformed effective configuration", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, ".oxlintrc.json"), "{ invalid");
  const outcomes = await _coverage({
    directory: directory,
    paths: ["src/reviewed.ts"],
    expectedStatus: 1,
  });
  expect(
    outcomes.find((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-001";
    }),
  ).toMatchObject({ state: "fallback", operational: false });
});

it("keeps unconfigured module syntax and unknown frameworks in fallback", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.mts"), "export {};\n");
  writeFileSync(join(directory, "src/reviewed.vue"), "<template />\n");
  const outcomes = await _coverage({
    directory: directory,
    paths: ["src/reviewed.mts", "src/reviewed.vue"],
  });
  expect(
    outcomes.filter((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-001";
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ language: "typescript", state: "fallback" }),
      expect.objectContaining({ language: "unknown", state: "fallback" }),
    ]),
  );
});

it("limits native engine concurrency to one while coalescing file capabilities", async () => {
  const directory = _createRepository();
  rmSync(join(directory, "node_modules"));
  mkdirSync(join(directory, "node_modules/.bin"), { recursive: true });
  symlinkSync(
    join(ROOT, "node_modules/oxlint-tsgolint"),
    join(directory, "node_modules/oxlint-tsgolint"),
  );
  const log = join(directory, "processes.jsonl");
  const wrapper = `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const log = ${JSON.stringify(log)};
appendFileSync(log, \`\${JSON.stringify({ event: "start", pid: process.pid })}\\n\`);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
const result = spawnSync(${JSON.stringify(join(ROOT, "node_modules/.bin/oxlint"))}, process.argv.slice(2), { stdio: "inherit" });
appendFileSync(log, \`\${JSON.stringify({ event: "end", pid: process.pid })}\\n\`);
process.exit(result.status ?? 1);
`;
  writeFileSync(join(directory, "node_modules/.bin/oxlint"), wrapper, {
    mode: 0o755,
  });
  const outcomes = await _coverage({ directory: directory, paths: ["src"] });
  expect(
    outcomes.filter((entry: { ruleId: string; state: string }) => {
      return entry.ruleId === "avlint-ts-001" && entry.state === "enforced";
    }),
  ).toHaveLength(2);
  const events = readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map((line): { event: "start" | "end" } => {
      return JSON.parse(line);
    });
  let active = 0;
  const activeCounts = events.map(({ event }) => {
    active += event === "start" ? 1 : -1;
    return active;
  });
  expect(
    events.filter(({ event }) => {
      return event === "start";
    }),
  ).toHaveLength(3);
  expect(Math.max(...activeCounts)).toBe(1);
  expect(active).toBe(0);
});

it("keeps warning-only curly in fallback beside independently blocking seeds", async () => {
  const directory = _createRepository();
  const path = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  config.overrides.push({
    files: ["src/reviewed.ts"],
    rules: { curly: "warn" },
  });
  writeFileSync(path, JSON.stringify(config));
  const outcomes = await _coverage({ directory: directory });
  expect(
    outcomes.find((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-001";
    }),
  ).toMatchObject({ state: "fallback" });
  expect(
    outcomes.find((entry: { ruleId: string }) => {
      return entry.ruleId === "avlint-ts-004";
    }),
  ).toMatchObject({ state: "enforced" });
});
