import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../../../src/cli/main";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
const SAFE = [
  ["AF-15", "literal-property-map", "property-helper-callbacks"],
  ["AF-15", "literal-property-equality", "property-helper-callbacks"],
  ["AF-16", "fresh-data-object", "straight-line-object-construction"],
  ["AF-17", "optional-parameter-candidates", "optional-array-candidates"],
] as const;
const IMPORT = 'import { identity } from "@avandar/utils";\n';
const PROOF_IMPORT = 'import { identity, prop, propEq, isDefined } from "@avandar/utils";\n';
const SOURCES = [
  IMPORT + 'export const result: number[] = [{ id: 1 }].map(function(row) { return row.id; });',
  IMPORT + 'export const result: { id: number }[] = [{ id: 1 }].filter(function(row) { return row.id === 1; });',
  'export function build(): { count: number } { const result = { count: 0 }; result.count = 2; return result; }',
  PROOF_IMPORT + 'export function build(first: number | null | undefined, second: number | null | undefined): (number | null)[] { const result: (number | null)[] = []; if (first !== undefined) {\n  result.push(first);\n} if (second !== undefined) {\n  result.push(second);\n} return result; }',
];

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(extension = "ts", source = PROOF_IMPORT) {
  const directory = mkdtempSync(join(tmpdir(), "utility-coverage-"));
  directories.push(directory);
  ["node_modules", "eslint"].forEach((name) => { symlinkSync(join(ROOT, name), join(directory, name)); });
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(join(directory, "package.json"), JSON.stringify({ scripts: { lint: "oxlint --report-unused-disable-directives-severity=error ." } }));
  writeFileSync(join(directory, ".oxlintrc.json"), readFileSync(join(ROOT, ".oxlintrc.json")));
  writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, module: "preserve", moduleResolution: "bundler", target: "ESNext", types: [], skipLibCheck: true, allowImportingTsExtensions: true, paths: { "@utils/*": [join(ROOT, "packages/shared/utils/src/*")] } }, include: ["src"] }));
  writeFileSync(join(directory, `src/reviewed.${extension}`), source);
  return directory;
}

function _fix(source: string, extension = "ts", root = false, disabled?: string) {
  const directory = _createRepository(extension, source);
  const config = JSON.parse(readFileSync(join(directory, ".oxlintrc.json"), "utf8"));
  if (!root) {
    config.rules = Object.fromEntries(SAFE.map(([, , name]) => { return [`avandar/${name}`, "error"]; }));
    config.overrides = [];
    config.options = {};
  }
  if (disabled) { config.rules[`avandar/${disabled}`] = "off"; }
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  const path = join(directory, `src/reviewed.${extension}`);
  const run = () => { return spawnSync(join(ROOT, "node_modules/.bin/oxlint"), ["--fix", `src/reviewed.${extension}`], { cwd: directory, encoding: "utf8" }); };
  const first = run();
  expect(first.error, first.stdout + first.stderr).toBeUndefined();
  expect(first.status, first.stdout + first.stderr + readFileSync(path, "utf8")).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return { fixed, directory };
}

function _getTypeDiagnostics(source: string) {
  const directory = _createRepository("ts", source);
  const result = spawnSync(join(ROOT, "node_modules/.bin/tsc"), ["--project", directory, "--pretty", "false"], { cwd: directory, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  return { status: result.status, diagnostics: result.stdout + result.stderr };
}

it.each(SOURCES)("preserves valid TypeScript inference with actual public helper types: %s", (source) => {
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const { fixed } = _fix(source);
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it.each(["ts", "tsx", "js", "jsx"])("composes all utility repairs in the actual root engine for %s", (extension) => {
  const typed = ["ts", "tsx"].includes(extension);
  const params = typed ? "first: number | undefined, second: number | undefined" : "first, second";
  const arrayType = typed ? ": number[]" : "";
  const objectType = typed ? ": { count: number }" : "";
  const source = [PROOF_IMPORT, 'export const mapped = [{ id: 1 }].map(function(row) {', '  return row.id;', '});', `export function build(\n  ${params.replace(", ", ",\n  ")},\n)${arrayType} {`, `  const result${arrayType} = [];`, '  if (first !== undefined) {\n  result.push(first);\n}', '  if (second !== undefined) {\n  result.push(second);\n}', '  return result;', '}', `export function create()${objectType} {`, '  const result = { count: 0 };', '  result.count = 2;', '  return result;', '}'].join("\n");
  const { fixed } = _fix(source, extension, true);
  expect(fixed).toContain('.map(prop("id"))');
  expect(fixed.includes('[...result, first, second].filter(isDefined)')).toBe(typed);
  expect(fixed).toContain('{ ...result, count: 2 }');
});

it.each(SAFE)("keeps %s independently disabled", (ruleId, capability, name) => {
  const index = SAFE.findIndex((entry) => { return entry[1] === capability; });
  const source = SOURCES[index]!;
  expect(_fix(source, "ts", false, name).fixed).toBe(source);
});

it.each([
  'import type { prop } from "@avandar/utils"; export const mapped = [{ id: 1 }].map(function(row) { return row.id; });',
  IMPORT + 'export const result = [{ id: 1 }].map(function(row: { id: number }) { return row.id; });',
  IMPORT + 'export const result = [{ id: 1 }].map(function(row): number { return row.id; });',
  IMPORT + 'export const result = [{ id: 1 }].map(function<T>(row: T) { return row.id; });',
  IMPORT + 'export function build(undefined: number, first: number) { const result = []; if (first !== undefined) {\n  result.push(first);\n} return result; }',
])("keeps unsupported TS type and shadow contracts unchanged: %s", (source) => {
  expect(_fix(source).fixed).toBe(source);
});

async function _coverage(directory: string, extension = "ts", status = 0) {
  const stdout: string[] = [];
  const code = await runCli(["coverage", `src/reviewed.${extension}`, "--format", "json", "--no-prompt"], { cwd: directory, stdout: (value) => { stdout.push(value); }, stderr: () => {} });
  expect(code).toBe(status);
  return JSON.parse(stdout.join(""));
}

it.each(["ts", "tsx", "js", "jsx"])("proves canonical utility errors in the original import context for %s", async (extension) => {
  const directory = _createRepository(extension);
  const result = await _coverage(directory, extension);
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability, state: ruleId === "AF-17" && ["js", "jsx"].includes(extension) ? "fallback" : "enforced" }));
    expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability: "unsupported-shapes", state: "fallback" }));
    expect(result.summaries).toContainEqual(expect.objectContaining({ ruleId, state: "fallback" }));
  });
  expect(readFileSync(join(directory, `src/reviewed.${extension}`), "utf8")).toBe(PROOF_IMPORT);
});

it.each(["disabled", "source-disabled", "warning", "nested", "excluded", "missing-plugin", "malformed"])("keeps utility proofs in fallback when %s", async (reason) => {
  const directory = _createRepository();
  const path = join(directory, reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json");
  const config = reason === "nested" ? { jsPlugins: [{ name: "avandar", specifier: "@avandar/lint-typescript/oxlint" }] } : JSON.parse(readFileSync(path, "utf8"));
  if (reason === "source-disabled") {
    writeFileSync(join(directory, "src/reviewed.ts"), `/* eslint-disable ${[...new Set(SAFE.map(([, , name]) => { return `avandar/${name}`; }))].join(", ")} */\n${PROOF_IMPORT}`);
  } else if (reason === "excluded") { config.ignorePatterns.push("src/reviewed.ts"); }
  else if (reason === "missing-plugin") { config.jsPlugins = config.jsPlugins.filter((plugin: { name?: string }) => { return plugin.name !== "avandar"; }); }
  else { config.rules = Object.fromEntries(SAFE.map(([, , name]) => { return [`avandar/${name}`, reason === "warning" ? "warn" : "off"]; })); config.overrides = []; }
  writeFileSync(path, reason === "malformed" ? "{ invalid" : JSON.stringify(config));
  const result = await _coverage(directory, "ts", ["missing-plugin", "malformed"].includes(reason) ? 1 : 0);
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability, state: "fallback" }));
  });
});

it.each(['const globalValue = 1;', 'export {};', 'const marker = \'import "@avandar/utils";\';', '/* import "@avandar/utils"; */', 'import type { prop } from "@avandar/utils";'])("does not manufacture utility availability or module context: %s", async (source) => {
  const result = await _coverage(_createRepository("ts", source));
  SAFE.filter(([ruleId]) => { return ruleId !== "AF-16"; }).forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability, state: "fallback" }));
  });
});

function _loadUtility(name: string): Record<string, unknown> {
  const path = join(ROOT, `packages/shared/utils/src/${name}`);
  const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext } }).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (specifier: string) => { return _loadUtility(specifier.replace("@utils/", "")); } });
  return exports;
}

function _evaluate(source: string, extra: Record<string, unknown> = {}) {
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext,
  } }).outputText;
  const exports = {};
  const helpers = { prop: _loadUtility("objects/hofs/prop/prop.ts").prop, propEq: _loadUtility("objects/hofs/propEq/propEq.ts").propEq, isDefined: _loadUtility("guards/isDefined/isDefined.ts").isDefined };
  runInNewContext(output, {
    exports, require: () => { return helpers; }, ...extra,
  });
  return exports as Record<string, (...args: unknown[]) => unknown>;
}

it.each([[undefined, null], [0, false], ["", 2], [3, 4]])("retains optional candidate order and null using the actual helper: %s %s", (first, second) => {
  const source = SOURCES[3]!;
  const fixed = _fix(source).fixed;
  expect(_evaluate(fixed).build!(first, second))
    .toEqual(_evaluate(source).build!(first, second));
});

it("preserves object keys, prototype and ordinary data descriptors", () => {
  const source = 'export function build() { const result = { __proto__: null, first: 0 }; result.first = 2; result.second = null; return result; }';
  const fixed = _fix(source).fixed;
  const before = _evaluate(source).build!();
  const after = _evaluate(fixed).build!();
  expect(Object.keys(after as object)).toEqual(Object.keys(before as object));
  expect(Object.getPrototypeOf(after)).toBe(Object.getPrototypeOf(before));
  expect(Object.getOwnPropertyDescriptors(after))
    .toEqual(Object.getOwnPropertyDescriptors(before));
});

it.each(['import * as utilities from "@avandar/utils";', 'import "@avandar/utils";', 'import { prop as pick } from "@avandar/utils";'])("preserves root import behavior and idempotence: %s", (declaration) => {
  const source = `${declaration}\nexport const mapped = [{ id: 1 }].map(function(row) {\n  return row.id;\n});`;
  expect(_fix(source, "ts", true).fixed).not.toBe(source);
});

it("keeps two import-dependent capabilities independent in the seeded proof", async () => {
  const result = await _coverage(_createRepository("ts", 'import { prop } from "@avandar/utils";\n'));
  expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId: "AF-15", capability: "literal-property-map", state: "enforced" }));
  expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId: "AF-15", capability: "literal-property-equality", state: "fallback" }));
  expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId: "AF-17", capability: "optional-parameter-candidates", state: "fallback" }));
});

it.each([true, false])("preserves missing-import refusal after an existing-helper root repair, enabled %s", (enabled) => {
  const source = [
    'import { isDefined } from "@avandar/utils";',
    'export const mapped = [{ id: 1 }].map(function(row) {',
    '  return row.id;',
    '});',
    'export function build(first: number | undefined): number[] {',
    '  const values: number[] = [];',
    '  if (first !== undefined) {', '    values.push(first);', '  }',
    '  return values;',
    '}',
  ].join("\n");
  const fixed = _fix(source, "ts", true, enabled ? undefined : "optional-array-candidates").fixed;
  expect(fixed).toContain('.map(function(row)');
  expect(fixed).not.toContain('.map(prop(');
  expect(fixed.includes('.filter(isDefined)')).toBe(enabled);
});

it("keeps a type-only helper use outside competing native import repairs", () => {
  const source = ['import { prop } from "@avandar/utils";', '', 'export type Reader = typeof prop;', 'export const mapped = [{ id: 1 }].map(function(row) {', '  return row.id;', '});'].join("\n");
  expect(_fix(source, "ts", true).fixed).toContain('.map(function(row)');
});

it("does not credit the map capability from an equality diagnostic", async () => {
  const result = await _coverage(_createRepository("ts", 'import { propEq } from "@avandar/utils";\n'));
  expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId: "AF-15", capability: "literal-property-map", state: "fallback" }));
  expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId: "AF-15", capability: "literal-property-equality", state: "enforced" }));
});

it("leaves unbraced optional guards outside both ordinary root passes", () => {
  const source = ['import { isDefined } from "@avandar/utils";', '', 'export function build(first: number | undefined): number[] {', '  const values: number[] = [];', '  if (first !== undefined) values.push(first);', '  return values;', '}'].join("\n");
  const fixed = _fix(source, "ts", true).fixed;
  expect(fixed).toContain('const values: number[] = [];');
  expect(fixed).toContain('{values.push(first);}');
});

it("keeps constructed object lines within the real root line limit", () => {
  const source = [
    'export function build(): Record<string, number> {',
    '  const values = { first: 0, second: 0, third: 0, fourth: 0 };',
    '  values.first = 1000000000;', '  values.second = 1000000000;',
    '  values.third = 1000000000;', '  values.fourth = 1000000000;',
    '  return values;', '}',
  ].join("\n");
  expect(_fix(source, "ts", true).fixed).not.toBe(source);
});

it("keeps optional candidate lines within the real root line limit", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";', '',
    'export function build(',
    '  firstOptionalCandidate: number | undefined,',
    '  secondOptionalCandidate: number | undefined,',
    '  thirdOptionalCandidate: number | undefined,',
    '): number[] {', '  const values: number[] = [];',
    '  if (firstOptionalCandidate !== undefined) {',
    '    values.push(firstOptionalCandidate);', '  }',
    '  if (secondOptionalCandidate !== undefined) {',
    '    values.push(secondOptionalCandidate);', '  }',
    '  if (thirdOptionalCandidate !== undefined) {',
    '    values.push(thirdOptionalCandidate);', '  }',
    '  return values;', '}',
  ].join("\n");
  expect(_fix(source, "ts", true).fixed).not.toBe(source);
});

it("preserves unknown-parameter narrowing that the generic helper cannot express", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";', '',
    'export function build(candidate: unknown): ({} | null)[] {',
    '  const values: ({} | null)[] = [];',
    '  if (candidate !== undefined) {', '    values.push(candidate);', '  }',
    '  return values;', '}',
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  expect(_fix(source).fixed).toBe(source);
});

it("preserves literal-row map and strict-equality results with actual helpers", () => {
  const source = PROOF_IMPORT + [
    'export function read() {',
    '  return {',
    '    mapped: [{ id: null }, { id: 0 }, { id: false }, { id: "" }]',
    '      .map(function(row) { return row.id; }),',
    '    filtered: [{ id: 0 }, { id: "0" }, { id: false }]',
    '      .filter(function(row) { return row.id === 0; }),',
    '  };', '}',
  ].join("\n");
  const fixed = _fix(source).fixed;
  expect(fixed).not.toBe(source);
  expect(_evaluate(fixed).read!()).toEqual(_evaluate(source).read!());
});

it.each(["let", "var"])("composes %s normalization with object construction in one root pass", (kind) => {
  const source = ['export function build(): { count: number } {', `  ${kind} values = { count: 0 };`, '  values.count = 2;', '  return values;', '}'].join("\n");
  expect(_fix(source, "ts", true).fixed).toContain('return { ...values, count: 2 };');
  const disabled = _fix(source, "ts", true,
    "straight-line-object-construction").fixed;
  expect(disabled).toContain('const values = { count: 0 };');
  expect(disabled).toContain('values.count = 2;');
});

it.each(["let", "var"])("composes %s normalization with optional candidates in one root pass", (kind) => {
  const source = ['import { isDefined } from "@avandar/utils";', '', 'export function build(first: number | undefined): number[] {', `  ${kind} values: number[] = [];`, '  if (first !== undefined) {', '    values.push(first);', '  }', '  return values;', '}'].join("\n");
  expect(_fix(source, "ts", true).fixed)
    .toContain('return [...values, first].filter(isDefined);');
  const disabled = _fix(source, "ts", true, "optional-array-candidates").fixed;
  expect(disabled).toContain('const values: number[] = [];');
  expect(disabled).toContain('values.push(first);');
  expect(disabled).not.toContain('.filter(isDefined)');
});

it.each(["", ": (number | undefined)[]", ": any[]", ": unknown[]"])("keeps unsupported evolving or narrowing array annotations unchanged: %s", (annotation) => {
  const source = ['import { isDefined } from "@avandar/utils";', '', 'export function build(first: number | undefined) {', `  const values${annotation} = [];`, '  if (first !== undefined) {', '    values.push(first);', '  }', '  return values;', '}'].join("\n");
  expect(_fix(source).fixed).toBe(source);
});

it("keeps an annotated object binding in fallback", () => {
  const source = 'export function build() { const values: { count: number } = { count: 0 }; values.count = 2; return values; }';
  expect(_fix(source).fixed).toBe(source);
});

it("does not add a missing optional-array helper import", () => {
  const source = [IMPORT, 'export function build(first: number | undefined) {', '  const values: number[] = [];', '  if (first !== undefined) {', '    values.push(first);', '  }', '  return values;', '}'].join("\n");
  expect(_fix(source).fixed).toBe(source);
});

it.each(["(number | string | null | false)[]", "Array<number | string | null | false>"])("preserves inferred primitive-union returns and native annotation repair for %s", (annotation) => {
  const source = [
    'import { isDefined } from "@avandar/utils";', '',
    'function build(first: number | string | null | false | undefined) {',
    `  const values: ${annotation} = [];`,
    '  if (first !== undefined) {', '    values.push(first);', '  }',
    '  return values;', '}',
    'export const response: (number | string | null | false)[] = build(1);',
    'response.push("allowed");', 'response.push(false);',
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source, "ts", true).fixed;
  expect(fixed).toContain('return [...values, first].filter(isDefined);');
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it.each([
  [undefined, undefined, []], [undefined, null, [null]],
  [0, false, [0, false, 0]], ["", 2, ["", 2, ""]],
  [3, 4, [3, 4, 3]], [null, null, [null, null, null]],
  [[], [1], [[], [1], []]],
])("retains repeated candidates and ordinary iterator order for %s %s", (first, second, expected) => {
  const source = SOURCES[3]!.replace('return result;', 'if (first !== undefined) {\n result.push(first);\n} return result;');
  const fixed = _fix(source).fixed;
  expect(fixed).not.toBe(source);
  expect(_evaluate(source).build!(first, second)).toEqual(expected);
  expect(_evaluate(fixed).build!(first, second)).toEqual(expected);
});

it.each(["const", "let", "var"])("keeps all %s custom collection fix ranges strictly after the declaration", (kind) => {
  ["straight-line-object-construction", "optional-array-candidates"].forEach((name) => {
    const source = name === "straight-line-object-construction"
      ? `export function build() { ${kind} values = { count: 0 }; values.count = 2; return values; }`
      : ['import { isDefined } from "@avandar/utils";', `export function build(first: number | undefined) { ${kind} values: number[] = [];`, 'if (first !== undefined) {', '  values.push(first);', '}', 'return values; }'].join("\n");
    const directory = _createRepository("ts", source);
    const probe = join(directory, "range-probe.mjs");
    writeFileSync(probe, [
      `import { eslintCompatPlugin } from ${JSON.stringify(join(ROOT, "packages/lint/typescript/node_modules/@oxlint/plugins/index.js"))};`,
      `import rule from ${JSON.stringify(join(ROOT, `packages/lint/typescript/src/oxlint/rules/${name}.js`))};`,
      'export default eslintCompatPlugin({ rules: { probe: {',
      '  meta: rule.meta, createOnce(context) {',
      '    return rule.createOnce({',
      '      get sourceCode() { return context.sourceCode; },',
      '      get filename() { return context.filename; },',
      '      report(descriptor) {',
      '        const boundary = descriptor.node.parent.parent.body[0].range[1];',
      '        context.report({ ...descriptor, fix(fixer) {',
      '          const edits = descriptor.fix(fixer);',
      '          if (edits.some((edit) => edit.range[0] <= boundary)) {',
      '            throw new Error("Collection edit reserved its declaration");',
      '          }',
      '          return edits;',
      '        } });',
      '      },',
      '    });',
      '  },',
      '} } });',
    ].join("\n"));
    writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify({ categories: { correctness: "off" }, jsPlugins: [{ name: "ranges", specifier: probe }], rules: { "ranges/probe": "error" } }));
    const result = spawnSync(join(ROOT, "node_modules/.bin/oxlint"), ["--fix", "src/reviewed.ts"], { cwd: directory, encoding: "utf8" });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const fixed = readFileSync(join(directory, "src/reviewed.ts"), "utf8");
    expect(fixed).not.toBe(source);
    expect(fixed).toContain(`${kind} values`);
  });
});

it("preserves literal-union array return inference", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";', '',
    'function build(first: "first" | "second" | null | false | 0 | "" | undefined) {',
    '  const values: ("first" | "second" | null | false | 0 | "")[] = [];',
    '  if (first !== undefined) {', '    values.push(first);', '  }',
    '  return values;', '}',
    'export const response: ("first" | "second" | null | false | 0 | "")[] =',
    '  build("first");', 'response.push("second");',
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source, "ts", true).fixed;
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it("preserves inferred object return contracts without casts", () => {
  const source = [
    'function build() {',
    '  const values = { count: 0, ready: false, note: "", fallback: null };',
    '  values.count = 2;', '  values.ready = true;', '  values.note = "ready";',
    '  return values;', '}',
    'export const contract: () => {',
    '  count: number; ready: boolean; note: string; fallback: null;',
    '} = build;',
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source).fixed;
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});
