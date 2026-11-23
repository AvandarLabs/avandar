import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../../../src/cli/main";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
const SAFE = [
  ["AF-08", "direct-top-level-calls", "top-level-function-declarations"],
  ["AF-09", "direct-nested-calls", "nested-arrow-functions"],
  ["AF-10", "private-direct-calls", "private-helper-prefix"],
] as const;

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(extension = "ts") {
  const directory = mkdtempSync(join(tmpdir(), "source-coverage-"));
  directories.push(directory);
  ["node_modules", "eslint"].forEach((name) => {
    symlinkSync(join(ROOT, name), join(directory, name));
  });
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(join(directory, "package.json"), JSON.stringify({
    scripts: { lint: "oxlint --report-unused-disable-directives-severity=error ." },
  }));
  writeFileSync(join(directory, ".oxlintrc.json"), readFileSync(join(ROOT, ".oxlintrc.json")));
  writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, module: "preserve" },
    include: ["src"],
  }));
  writeFileSync(join(directory, `src/reviewed.${extension}`), "export {};\n");
  return directory;
}

async function _coverage(directory: string, extension = "ts", status = 0) {
  const stdout: string[] = [];
  const code = await runCli([
    "coverage", `src/reviewed.${extension}`, "--format", "json", "--no-prompt",
  ], {
    cwd: directory,
    stdout: (value) => { stdout.push(value); }, stderr: () => {},
  });
  expect(code).toBe(status);
  return JSON.parse(stdout.join(""));
}

it.each(["ts", "tsx", "js", "jsx"])("proves supported source capabilities with root rules for %s", async (extension) => {
  const directory = _createRepository(extension);
  const result = await _coverage(directory, extension);
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(expect.objectContaining({
      ruleId, capability, state: "enforced",
    }));
    expect(result.outcomes).toContainEqual(expect.objectContaining({
      ruleId, capability: "unsupported-shapes", state: "fallback",
    }));
    expect(result.summaries).toContainEqual(expect.objectContaining({ ruleId, state: "fallback" }));
  });
  expect(readFileSync(join(directory, `src/reviewed.${extension}`), "utf8")).toBe("export {};\n");
});

it.each(["disabled", "source-disabled", "warning", "nested", "excluded", "missing-plugin", "malformed"])(
  "keeps source proofs in fallback when %s", async (reason) => {
    const directory = _createRepository();
    const path = join(directory, reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json");
    const config = reason === "nested" ? { jsPlugins: [{
      name: "avandar", specifier: "@avandar/lint-typescript/oxlint",
    }] }
      : JSON.parse(readFileSync(path, "utf8"));
    if (reason === "source-disabled") {
      writeFileSync(join(directory, "src/reviewed.ts"),
        `/* eslint-disable ${SAFE.map(([, , name]) => { return `avandar/${name}`; }).join(", ")} */\nexport {};\n`);
    } else if (reason === "excluded") {
      config.ignorePatterns.push("src/reviewed.ts");
    } else if (reason === "missing-plugin") {
      config.jsPlugins = config.jsPlugins.filter(
        (plugin: { name?: string }) => {
        return plugin.name !== "avandar";
        },
      );
    } else {
      config.rules = Object.fromEntries(SAFE.map(([, , name]) => {
        return [`avandar/${name}`, reason === "warning" ? "warn" : "off"];
      }));
      config.overrides = [];
    }
    writeFileSync(path, reason === "malformed" ? "{ invalid" : JSON.stringify(config));
    const result = await _coverage(directory, "ts", ["missing-plugin", "malformed"].includes(reason) ? 1 : 0);
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability, state: "fallback" }));
    });
  },
);

function _fix(source: string, extension = "ts", rules: string[] = SAFE.map(([, , name]) => { return name; }), root = false) {
  const directory = _createRepository(extension);
  const path = join(directory, `src/reviewed.${extension}`);
  const config = JSON.parse(readFileSync(join(directory, ".oxlintrc.json"), "utf8"));
  if (!root) {
    config.rules = Object.fromEntries(rules.map((name) => { return [`avandar/${name}`, "error"]; }));
    config.overrides = [];
    config.options = {};
  }
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  writeFileSync(path, source);
  const run = () => { return spawnSync(join(ROOT, "node_modules/.bin/oxlint"),
    ["--fix", `src/reviewed.${extension}`], { cwd: directory, encoding: "utf8" }); };
  const first = run();
  expect(first.error, first.stdout + first.stderr).toBeUndefined();
  expect(first.status, first.stdout + first.stderr).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

it.each(["ts", "tsx", "js", "jsx"])("composes ordinary function fixes idempotently for %s", (extension) => {
  expect(_fix("export {}; const read = () => { consume(); return 1; }; read(); function load() { function nested() { return 2; } return nested(); } load(); function helper() { return 3; } export function run() { return helper(); }", extension))
    .toBe("export {}; function read() { consume(); return 1; } read(); function load() { const nested = () => { return 2; }; return nested(); } load(); function _helper() { return 3; } export function run() { return _helper(); }");
});

it.each([
  "export {}; function outer() { function read(value: number): number; function read(value: number) { return value; } return read(1); }",
  "export {}; const _read: () => number = () => 1; _read();",
  "export {}; const _read = <T>(value: T) => value; _read(1);",
  "export {}; function read(value: number): number; function read(value: number) { return value; } read(1);",
  "export {}; const _read = () => 1; type Read = typeof _read; _read();",
  "export {}; class Reader extends Base { method() { const _read = () => super.method(); return _read(); } }",
])("preserves unsupported TypeScript function contracts: %s", (source) => {
  expect(_fix(source)).toBe(source);
});

it.each([
  [["top-level-function-declarations"], "export {}; const read = function() { return 1; }; read();", "export {}; function read() { return 1; } read();"],
  [["private-helper-prefix"], "export {}; const read = function() { return 1; }; export function load() { return read(); }", "export {}; const _read = function() { return 1; }; export function load() { return _read(); }"],
  [["nested-arrow-functions"], "export {}; function load() { function read() { return 1; } return read(); }", "export {}; function load() { const read = () => { return 1; }; return read(); }"],
])("applies only enabled source rules %j", (rules, source, output) => {
  expect(_fix(source as string, "ts", rules as string[])).toBe(output);
});

it("preserves typed signatures in the supported direct-call subset", () => {
  expect(_fix("export {}; const _read = (value: number): number => { consume(); return value; }; _read(1); function _load() { function read(value: number): number { return value; } return read(2); } _load();"))
    .toBe("export {}; function _read(value: number): number { consume(); return value; } _read(1); function _load() { const read = (value: number): number => { return value; }; return read(2); } _load();");
});

it("keeps interleaved conversion and rename envelopes disjoint in one native pass", () => {
  expect(_fix("export {}; function helper() { return 1; } const direct = function() { return 2; }; direct(); export function load() { return helper(); } function other() { return 3; } export function run() { return other(); }"))
    .toBe("export {}; function helper() { return 1; } function direct() { return 2; } direct(); export function load() { return helper(); } function _other() { return 3; } export function run() { return _other(); }");
});

it.each([
  ["export {}; const _read = (): number => 1; _read();", "export {}; const _read = (): number => {return 1}; _read();"],
  ["export {};\nconst _read = (): number => { if (flag) consume(); return 1; };\n_read();", "export {};\nconst _read = (): number => { if (flag) {consume();} return 1; };\n_read();"],
  ["export {}; function read(): string { return 'value' as 'value'; } export function load(): string { return read(); }", "export {}; function read(): string { return 'value' as const; } export function load(): string { return read(); }"],
  ["export {}; function read(): number { return 1; }\n/**\n * Read a value.\n */\nexport function load(): number { return read(); }", "export {}; function read(): number { return 1; }\n/** Read a value. */\nexport function load(): number { return read(); }"],
  ["export function load(): number {\n  function read(): number {\n    /** Read only once. */\n    return 1;\n  }\n  return read();\n}", "export function load(): number {\n  function read(): number {\n    // Read only once.\n    return 1;\n  }\n  return read();\n}"],
  ["export function load(): number {\n  function read(callback = () => 1): number { return callback(); }\n  return read();\n}", "export function load(): number {\n  function read(callback = () => {return 1}): number { return callback(); }\n  return read();\n}"],
])("composes root native and comment repairs without exposing function edits: %s", (source, output) => {
  expect(_fix(source, "ts", undefined, true)).toBe(output);
});

it("renames separate adjacent helper pairs in one native pass", () => {
  expect(_fix("export {}; function first() { return 1; } export function load() { return first(); } function second() { return 2; } export function run() { return second(); }"))
    .toBe("export {}; function _first() { return 1; } export function load() { return _first(); } function _second() { return 2; } export function run() { return _second(); }");
});

it.each([
  "export {}; function read() { return 1; } export function load(_read: () => number) { return read() + _read(); }",
  "export {}; function read() { return 1; } export function load() { return read() + _read(); }",
  "export {}; function read() { return 1; } export function load() { return read.name; }",
  "export {}; const contract = 'r\\u0065ad'; function read() { return 1; } export function load() { return read(); }",
])("preserves exact adjacent export collision and identity contracts: %s", (source) => {
  expect(_fix(source)).toBe(source);
});

function _getTypeDiagnostics(source: string) {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.ts"), source);
  writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      strict: true, noEmit: true, module: "preserve", target: "ESNext",
      types: [], skipLibCheck: true,
    },
    include: ["src"],
  }));
  const result = spawnSync(join(ROOT, "node_modules/.bin/tsc"),
    ["--project", directory, "--pretty", "false"],
    { cwd: directory, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  return { status: result.status, diagnostics: result.stdout + result.stderr };
}

it.each(["asserts candidate", "asserts candidate is number"])(
  "preserves declaration narrowing and zero TypeScript errors for %s",
  (assertion) => {
    const source = [
      `declare function check(candidate: unknown): ${assertion};`,
      "export function load(value: number | undefined): number {",
      "  function read(",
      "    candidate: number | undefined,",
      `  ): ${assertion} {`,
      "    check(candidate);",
      "  }",
      "  read(value);",
      "  return value;",
      "}",
    ].join("\n");
    expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
    const fixed = _fix(source, "ts", undefined, true);
    expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
    expect(fixed).toBe(source);
  },
);

it("preserves the TypeScript pseudo-this parameter through native root repair", () => {
  const source = [
    "export function load(): number {",
    "  function read(this: void): number { return 1; }",
    "  return read();",
    "}",
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source, "ts", undefined, true);
  expect(fixed).toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});
