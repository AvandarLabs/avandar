import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  PROOF_IMPORT,
  ROOT,
  SAFE,
  SOURCES,
  createUtilityRepository as _createRepository,
  evaluateUtilitySource as _evaluate,
  fixUtilitySource as _fix,
  getUtilityTypeDiagnosticsFromSource as _getTypeDiagnostics,
} from "./utilityFixers.fixtures";

it.each(["ts", "tsx", "js", "jsx"])(
  "composes all utility repairs in the actual root engine for %s",
  (extension) => {
    const typed = ["ts", "tsx"].includes(extension);
    const params = typed
      ? "first: number | undefined, second: number | undefined"
      : "first, second";
    const arrayType = typed ? ": number[]" : "";
    const objectType = typed ? ": { count: number }" : "";
    const source = [
      PROOF_IMPORT,
      "export const mapped = [{ id: 1 }].map(function(row) {",
      "  return row.id;",
      "});",
      `export function build(\n  ${params.replace(", ", ",\n  ")},\n)${arrayType} {`,
      `  const result${arrayType} = [];`,
      "  if (first !== undefined) {\n  result.push(first);\n}",
      "  if (second !== undefined) {\n  result.push(second);\n}",
      "  return result;",
      "}",
      `export function create()${objectType} {`,
      "  const result = { count: 0 };",
      "  result.count = 2;",
      "  return result;",
      "}",
    ].join("\n");
    const { fixed } = _fix({
      source: source,
      extension: extension,
      root: true,
    });
    expect(fixed).toContain('.map(prop("id"))');
    expect(fixed.includes("[...result, first, second].filter(isDefined)")).toBe(
      typed,
    );
    expect(fixed).toContain("{ ...result, count: 2 }");
  },
);

it.each(SAFE)(
  "keeps %s independently disabled",
  (_ruleId, capability, name) => {
    const index = SAFE.findIndex((entry) => {
      return entry[1] === capability;
    });
    const source = SOURCES[index]!;
    expect(
      _fix({ source: source, extension: "ts", root: false, disabled: name })
        .fixed,
    ).toBe(source);
  },
);

it.each([
  'import * as utilities from "@avandar/utils";',
  'import "@avandar/utils";',
  'import { prop as pick } from "@avandar/utils";',
])("preserves root import behavior and idempotence: %s", (declaration) => {
  const source = `${declaration}\nexport const mapped = [{ id: 1 }].map(function(row) {\n  return row.id;\n});`;
  expect(_fix({ source: source, extension: "ts", root: true }).fixed).not.toBe(
    source,
  );
});

it.each([true, false])(
  "preserves missing-import refusal after an existing-helper root repair, enabled %s",
  (enabled) => {
    const source = [
      'import { isDefined } from "@avandar/utils";',
      "export const mapped = [{ id: 1 }].map(function(row) {",
      "  return row.id;",
      "});",
      "export function build(first: number | undefined): number[] {",
      "  const values: number[] = [];",
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
    ].join("\n");
    const fixed = _fix({
      source: source,
      extension: "ts",
      root: true,
      disabled: enabled ? undefined : "optional-array-candidates",
    }).fixed;
    expect(fixed).toContain(".map(function(row)");
    expect(fixed).not.toContain(".map(prop(");
    expect(fixed.includes(".filter(isDefined)")).toBe(enabled);
  },
);

it("keeps a type-only helper use outside competing native import repairs", () => {
  const source = [
    'import { prop } from "@avandar/utils";',
    "",
    "export type Reader = typeof prop;",
    "export const mapped = [{ id: 1 }].map(function(row) {",
    "  return row.id;",
    "});",
  ].join("\n");
  expect(_fix({ source: source, extension: "ts", root: true }).fixed).toContain(
    ".map(function(row)",
  );
});

it("keeps constructed object lines within the real root line limit", () => {
  const source = [
    "export function build(): Record<string, number> {",
    "  const values = { first: 0, second: 0, third: 0, fourth: 0 };",
    "  values.first = 1000000000;",
    "  values.second = 1000000000;",
    "  values.third = 1000000000;",
    "  values.fourth = 1000000000;",
    "  return values;",
    "}",
  ].join("\n");
  expect(_fix({ source: source, extension: "ts", root: true }).fixed).not.toBe(
    source,
  );
});

it("preserves literal-row map and strict-equality results with actual helpers", () => {
  const source = `${PROOF_IMPORT}${[
    "export function read() {",
    "  return {",
    '    mapped: [{ id: null }, { id: 0 }, { id: false }, { id: "" }]',
    "      .map(function(row) { return row.id; }),",
    '    filtered: [{ id: 0 }, { id: "0" }, { id: false }]',
    "      .filter(function(row) { return row.id === 0; }),",
    "  };",
    "}",
  ].join("\n")}`;
  const fixed = _fix({ source: source }).fixed;
  expect(fixed).not.toBe(source);
  expect(_evaluate({ source: fixed }).read!()).toEqual(
    _evaluate({ source: source }).read!(),
  );
});

it.each(["let", "var"])(
  "composes %s normalization with object construction in one root pass",
  (kind) => {
    const source = [
      "export function build(): { count: number } {",
      `  ${kind} values = { count: 0 };`,
      "  values.count = 2;",
      "  return values;",
      "}",
    ].join("\n");
    expect(
      _fix({ source: source, extension: "ts", root: true }).fixed,
    ).toContain("return { ...values, count: 2 };");
    const disabled = _fix({
      source: source,
      extension: "ts",
      root: true,
      disabled: "straight-line-object-construction",
    }).fixed;
    expect(disabled).toContain("const values = { count: 0 };");
    expect(disabled).toContain("values.count = 2;");
  },
);

it.each(["", ": (number | undefined)[]", ": any[]", ": unknown[]"])(
  "keeps unsupported evolving or narrowing array annotations unchanged: %s",
  (annotation) => {
    const source = [
      'import { isDefined } from "@avandar/utils";',
      "",
      "export function build(first: number | undefined) {",
      `  const values${annotation} = [];`,
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
    ].join("\n");
    expect(_fix({ source: source }).fixed).toBe(source);
  },
);

it.each([
  "(number | string | null | false)[]",
  "Array<number | string | null | false>",
])(
  "preserves inferred primitive-union returns and native annotation repair for %s",
  (annotation) => {
    const source = [
      'import { isDefined } from "@avandar/utils";',
      "",
      "function build(first: number | string | null | false | undefined) {",
      `  const values: ${annotation} = [];`,
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
      "export const response: (number | string | null | false)[] = build(1);",
      'response.push("allowed");',
      "response.push(false);",
    ].join("\n");
    expect(_getTypeDiagnostics({ source: source })).toEqual({
      status: 0,
      diagnostics: "",
    });
    const fixed = _fix({ source: source, extension: "ts", root: true }).fixed;
    expect(fixed).toContain("return [...values, first].filter(isDefined);");
    expect(_getTypeDiagnostics({ source: fixed })).toEqual({
      status: 0,
      diagnostics: "",
    });
  },
);

it.each([
  [undefined, undefined, []],
  [undefined, null, [null]],
  [0, false, [0, false, 0]],
  ["", 2, ["", 2, ""]],
  [3, 4, [3, 4, 3]],
  [null, null, [null, null, null]],
  [[], [1], [[], [1], []]],
])(
  "retains repeated candidates and ordinary iterator order for %s %s",
  (first, second, expected) => {
    const source = SOURCES[3]!.replace(
      "return result;",
      "if (first !== undefined) {\n result.push(first);\n} return result;",
    );
    const fixed = _fix({ source: source }).fixed;
    expect(fixed).not.toBe(source);
    expect(_evaluate({ source: source }).build!(first, second)).toEqual(
      expected,
    );
    expect(_evaluate({ source: fixed }).build!(first, second)).toEqual(
      expected,
    );
  },
);

it.each(["const", "let", "var"])(
  "keeps all %s custom collection fix ranges strictly after the declaration",
  (kind) => {
    ["straight-line-object-construction", "optional-array-candidates"].forEach(
      (name) => {
        const source =
          name === "straight-line-object-construction"
            ? `export function build() { ${kind} values = { count: 0 }; values.count = 2; return values; }`
            : [
                'import { isDefined } from "@avandar/utils";',
                `export function build(first: number | undefined) { ${kind} values: number[] = [];`,
                "if (first !== undefined) {",
                "  values.push(first);",
                "}",
                "return values; }",
              ].join("\n");
        const directory = _createRepository({
          extension: "ts",
          source: source,
        });
        const probe = join(directory, "range-probe.mjs");
        writeFileSync(
          probe,
          [
            `import { eslintCompatPlugin } from ${JSON.stringify(join(ROOT, "packages/lint/typescript/node_modules/@oxlint/plugins/index.js"))};`,
            `import rule from ${JSON.stringify(join(ROOT, `packages/lint/typescript/src/oxlint/rules/${name}.js`))};`,
            "export default eslintCompatPlugin({ rules: { probe: {",
            "  meta: rule.meta, createOnce(context) {",
            "    return rule.createOnce({",
            "      get sourceCode() { return context.sourceCode; },",
            "      get filename() { return context.filename; },",
            "      report(descriptor) {",
            "        const boundary = descriptor.node.parent.parent.body[0].range[1];",
            "        context.report({ ...descriptor, fix(fixer) {",
            "          const edits = descriptor.fix(fixer);",
            "          if (edits.some((edit) => edit.range[0] <= boundary)) {",
            '            throw new Error("Collection edit reserved its declaration");',
            "          }",
            "          return edits;",
            "        } });",
            "      },",
            "    });",
            "  },",
            "} } });",
          ].join("\n"),
        );
        writeFileSync(
          join(directory, ".oxlintrc.json"),
          JSON.stringify({
            categories: { correctness: "off" },
            jsPlugins: [{ name: "ranges", specifier: probe }],
            rules: { "ranges/probe": "error" },
          }),
        );
        const result = spawnSync(
          join(ROOT, "node_modules/.bin/oxlint"),
          ["--fix", "src/reviewed.ts"],
          { cwd: directory, encoding: "utf8" },
        );
        expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
        const fixed = readFileSync(join(directory, "src/reviewed.ts"), "utf8");
        expect(fixed).not.toBe(source);
        expect(fixed).toContain(`${kind} values`);
      },
    );
  },
);
