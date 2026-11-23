import { expect, it } from "vitest";
import {
  IMPORT,
  SOURCES,
  evaluateUtilitySource as _evaluate,
  fixUtilitySource as _fix,
  getUtilityTypeDiagnosticsFromSource as _getTypeDiagnostics,
} from "./utilityFixers.fixtures";

it.each([
  [undefined, null],
  [0, false],
  ["", 2],
  [3, 4],
])(
  "retains optional candidate order and null using the actual helper: %s %s",
  (first, second) => {
    const source = SOURCES[3]!;
    const fixed = _fix({ source: source }).fixed;
    expect(_evaluate({ source: fixed }).build!(first, second)).toEqual(
      _evaluate({ source: source }).build!(first, second),
    );
  },
);

it("preserves object keys, prototype and ordinary data descriptors", () => {
  const source =
    "export function build() { const result = { __proto__: null, first: 0 }; result.first = 2; result.second = null; return result; }";
  const fixed = _fix({ source: source }).fixed;
  const before = _evaluate({ source: source }).build!();
  const after = _evaluate({ source: fixed }).build!();
  expect(Object.keys(after as object)).toEqual(Object.keys(before as object));
  expect(Object.getPrototypeOf(after)).toBe(Object.getPrototypeOf(before));
  expect(Object.getOwnPropertyDescriptors(after)).toEqual(
    Object.getOwnPropertyDescriptors(before),
  );
});

it("leaves unbraced optional guards outside both ordinary root passes", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";',
    "",
    "export function build(first: number | undefined): number[] {",
    "  const values: number[] = [];",
    "  if (first !== undefined) values.push(first);",
    "  return values;",
    "}",
  ].join("\n");
  const fixed = _fix({ source: source, extension: "ts", root: true }).fixed;
  expect(fixed).toContain("const values: number[] = [];");
  expect(fixed).toContain("{values.push(first);}");
});

it("keeps optional candidate lines within the real root line limit", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";',
    "",
    "export function build(",
    "  firstOptionalCandidate: number | undefined,",
    "  secondOptionalCandidate: number | undefined,",
    "  thirdOptionalCandidate: number | undefined,",
    "): number[] {",
    "  const values: number[] = [];",
    "  if (firstOptionalCandidate !== undefined) {",
    "    values.push(firstOptionalCandidate);",
    "  }",
    "  if (secondOptionalCandidate !== undefined) {",
    "    values.push(secondOptionalCandidate);",
    "  }",
    "  if (thirdOptionalCandidate !== undefined) {",
    "    values.push(thirdOptionalCandidate);",
    "  }",
    "  return values;",
    "}",
  ].join("\n");
  expect(_fix({ source: source, extension: "ts", root: true }).fixed).not.toBe(
    source,
  );
});

it("preserves unknown-parameter narrowing that the generic helper cannot express", () => {
  const source = [
    'import { isDefined } from "@avandar/utils";',
    "",
    "export function build(candidate: unknown): ({} | null)[] {",
    "  const values: ({} | null)[] = [];",
    "  if (candidate !== undefined) {",
    "    values.push(candidate);",
    "  }",
    "  return values;",
    "}",
  ].join("\n");
  expect(_getTypeDiagnostics({ source: source })).toEqual({
    status: 0,
    diagnostics: "",
  });
  expect(_fix({ source: source }).fixed).toBe(source);
});

it.each(["let", "var"])(
  "composes %s normalization with optional candidates in one root pass",
  (kind) => {
    const source = [
      'import { isDefined } from "@avandar/utils";',
      "",
      "export function build(first: number | undefined): number[] {",
      `  ${kind} values: number[] = [];`,
      "  if (first !== undefined) {",
      "    values.push(first);",
      "  }",
      "  return values;",
      "}",
    ].join("\n");
    expect(
      _fix({ source: source, extension: "ts", root: true }).fixed,
    ).toContain("return [...values, first].filter(isDefined);");
    const disabled = _fix({
      source: source,
      extension: "ts",
      root: true,
      disabled: "optional-array-candidates",
    }).fixed;
    expect(disabled).toContain("const values: number[] = [];");
    expect(disabled).toContain("values.push(first);");
    expect(disabled).not.toContain(".filter(isDefined)");
  },
);

it("keeps an annotated object binding in fallback", () => {
  const source =
    "export function build() { const values: { count: number } = { count: 0 }; values.count = 2; return values; }";
  expect(_fix({ source: source }).fixed).toBe(source);
});

it("does not add a missing optional-array helper import", () => {
  const source = [
    IMPORT,
    "export function build(first: number | undefined) {",
    "  const values: number[] = [];",
    "  if (first !== undefined) {",
    "    values.push(first);",
    "  }",
    "  return values;",
    "}",
  ].join("\n");
  expect(_fix({ source: source }).fixed).toBe(source);
});
