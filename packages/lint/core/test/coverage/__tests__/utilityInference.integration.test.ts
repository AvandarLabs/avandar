import { join } from "node:path";
import { expect, it } from "vitest";
import {
  IMPORT,
  PROOF_IMPORT,
  SOURCES,
  fixUtilitySource as _fix,
  getUtilityTypeDiagnostics as _getTypeDiagnostics,
} from "./utilityFixers.fixtures";

it.each(SOURCES)(
  "preserves valid TypeScript inference with actual public helper types: %s",
  (source) => {
    expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
    const { fixed } = _fix(source);
    expect(fixed).not.toBe(source);
    expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
  },
);

it.each([
  'import type { prop } from "@avandar/utils"; export const mapped = [{ id: 1 }].map(function(row) { return row.id; });',
  IMPORT +
    "export const result = [{ id: 1 }].map(function(row: { id: number }) { return row.id; });",
  IMPORT +
    "export const result = [{ id: 1 }].map(function(row): number { return row.id; });",
  IMPORT +
    "export const result = [{ id: 1 }].map(function<T>(row: T) { return row.id; });",
  IMPORT +
    "export function build(undefined: number, first: number) { const result = []; if (first !== undefined) {\n  result.push(first);\n} return result; }",
])("keeps unsupported TS type and shadow contracts unchanged: %s", (source) => {
  expect(_fix(source).fixed).toBe(source);
});

it("preserves literal-union array return inference", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";',
    "",
    'function build(first: "first" | "second" | null | false | 0 | "" | undefined) {',
    '  const values: ("first" | "second" | null | false | 0 | "")[] = [];',
    "  if (first !== undefined) {",
    "    values.push(first);",
    "  }",
    "  return values;",
    "}",
    'export const response: ("first" | "second" | null | false | 0 | "")[] =',
    '  build("first");',
    'response.push("second");',
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source, "ts", true).fixed;
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it("preserves inferred object return contracts without casts", () => {
  const source = [
    "function build() {",
    '  const values = { count: 0, ready: false, note: "", fallback: null };',
    "  values.count = 2;",
    "  values.ready = true;",
    '  values.note = "ready";',
    "  return values;",
    "}",
    "export const contract: () => {",
    "  count: number; ready: boolean; note: string; fallback: null;",
    "} = build;",
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source).fixed;
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it("review R1 preserves an inferred null filter predicate and existing contract", () => {
  const source = [
    'import { propEq } from "@avandar/utils";',
    "export const result = [{ id: null }, { id: 1 }].filter(function(row) {",
    "  return row.id === null;",
    "});",
    "export const contract: { id: null }[] = result;",
  ].join("\n");
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source).fixed;
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
  expect(fixed).toBe(source);
});

it.each([
  "export const result = [{ id: 1 }].map(function(row: { id?: number }) { return row.id; });\nresult.push(undefined);",
  "export const result = [{ id: null }, { id: 1 }].filter(function(row): row is { id: null } { return row.id === null; });\nexport const contract: { id: null }[] = result;",
  "export const result = [{ id: 1 }].map(function<T extends { id: number }>(row: T) { return row.id; });",
])("review R1 preserves explicit callback contracts: %s", (body) => {
  const source = PROOF_IMPORT + body;
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source).fixed;
  expect(fixed).toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it.each(["local", "imported", "interface"])(
  "review R2 preserves the compiler contract of a %s Array binding",
  (binding) => {
    const files = {
      "arrayTypes.ts": "export type Array<T> = (T | undefined)[];",
    };
    const declaration =
      binding === "local"
        ? "type Array<T> = (T | undefined)[];"
        : binding === "imported"
          ? 'import type { Array } from "./arrayTypes";'
          : "interface Array<T> extends ReadonlyArray<T | undefined> { push(...items: (T | undefined)[]): number; }";
    const source = [
      'import { isDefined } from "@avandar/utils";',
      declaration,
      "export function build(first: number | undefined) {",
      "  const values: Array<number> = [];",
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
      "export const response = build(1);",
      "response.push(undefined);",
    ].join("\n");
    expect(_getTypeDiagnostics(source, files)).toEqual({
      status: 0,
      diagnostics: "",
    });
    const fixed = _fix(source, "ts", false, undefined, files).fixed;
    expect(_getTypeDiagnostics(fixed, files)).toEqual({
      status: 0,
      diagnostics: "",
    });
    expect(fixed).toBe(source);
  },
);

it.each(["Array<number>", "number[]"])(
  "review R2 rejects outer Array type parameters for %s",
  (annotation) => {
    const source = [
      'import { isDefined } from "@avandar/utils";',
      "export function outer<Array>() {",
      "  function build(first: number | undefined) {",
      `    const values: ${annotation} = [];`,
      "    if (first !== undefined) {",
      "      values.push(first);",
      "    }",
      "    return values;",
      "  }",
      "  return build;",
      "}",
    ].join("\n");
    // A type parameter is not a generic constructor. T[] is the valid compiler
    // fixture, while Array<number> also needs an unchanged syntax refusal.
    if (annotation === "number[]") {
      expect(_getTypeDiagnostics(source)).toEqual({
        status: 0,
        diagnostics: "",
      });
    }
    expect(_fix(source).fixed).toBe(source);
  },
);

it.each(["local", "imported", "value"])(
  "review R2 keeps T[] refused with a resolved %s Array binding",
  (binding) => {
    const files = {
      "arrayTypes.ts": "export type Array<T> = (T | undefined)[];",
    };
    const declaration =
      binding === "local"
        ? "type Array<T> = (T | undefined)[];"
        : binding === "imported"
          ? 'import type { Array } from "./arrayTypes";'
          : "const Array = 1;";
    const source = [
      'import { isDefined } from "@avandar/utils";',
      declaration,
      "export function build(first: number | undefined) {",
      "  const values: number[] = [];",
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
    ].join("\n");
    expect(_getTypeDiagnostics(source, files)).toEqual({
      status: 0,
      diagnostics: "",
    });
    expect(_fix(source, "ts", false, undefined, files).fixed).toBe(source);
  },
);

it("review R2 stays refused after native Array<T> normalization", () => {
  const files = {
    "arrayTypes.ts": "export type Array<T> = (T | undefined)[];",
  };
  const source = [
    'import { isDefined } from "@avandar/utils";',
    'import type { Array } from "./arrayTypes";',
    "",
    "function build(first: number | undefined) {",
    "  const values: Array<number> = [];",
    "  if (first !== undefined) {",
    "    values.push(first);",
    "  }",
    "  return values;",
    "}",
    "export const response = build(1);",
  ].join("\n");
  const native = _fix(
    source,
    "ts",
    true,
    "optional-array-candidates",
    files,
  ).fixed;
  expect(native).toContain("const values: number[] = [];");
  expect(native).toContain("import type { Array }");
  expect(_fix(source, "ts", true, undefined, files).fixed).toBe(native);
});
