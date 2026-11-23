import { Linter } from "eslint";
import { expect, it } from "vitest";
import plugin from "../index";
import type { ESLint } from "eslint";

const LinterInstance: Linter = new Linter();
const RULE_NAMES = [
  "property-helper-callbacks",
  "straight-line-object-construction",
  "optional-array-candidates",
] as const;
function _fix({
  source,
  enabled = RULE_NAMES,
}: Readonly<{ source: string; enabled?: readonly string[] }>): string {
  const config = [
    {
      plugins: { avandar: plugin as unknown as ESLint.Plugin },
      rules: Object.fromEntries(
        enabled.map((name) => {
          return [`avandar/${name}`, "error" as const];
        }),
      ),
    },
  ];
  const result = LinterInstance.verifyAndFix(source, config);
  expect(result.messages).toEqual([]);
  expect(LinterInstance.verifyAndFix(result.output, config)).toMatchObject({
    fixed: false,
    output: result.output,
    messages: [],
  });
  return result.output;
}

it.each([
  [
    'import { identity } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });',
    'import { identity, prop } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(prop("id"));',
  ],
  [
    'import { prop as pick } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });',
    'import { prop as pick } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(pick("id"));',
  ],
  [
    'import * as utilities from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });',
    'import * as utilities from "@avandar/utils";\nexport const result = [{ id: 1 }].map(utilities.prop("id"));',
  ],
  [
    'import { identity } from "@avandar/utils";\nexport const result = [{ id: 1 }].filter(function(row) { return row.id === 1; });',
    'import { identity, propEq } from "@avandar/utils";\nexport const result = [{ id: 1 }].filter(propEq("id", 1));',
  ],
])(
  "preserves exact literal-array callbacks and helper bindings: %s",
  (source, expected) => {
    expect(_fix({ source: source, enabled: [RULE_NAMES[0]] })).toBe(expected);
  },
);

it.each([
  '[{ id: 1 }].map(function(row) { return row["a.b"]; })',
  "[{ id: 1 }].map(function(row) { return row[id]; })",
  "[{ id: 1 }].map(function(row) { return row?.id; })",
  "[{ get id() { return 1; } }].map(function(row) { return row.id; })",
  "[{ id: read() }].map(function(row) { return row.id; })",
  "[{ id: 1 }].map(function(row) { consume(row); return row.id; })",
  "[{ id: 1 }].map(function(row) { return alias.id; })",
  "[{ id: 1 }].filter(function(row) { return row.id == 1; })",
  "[{ id: 1 }].filter(function(row) { return row.id === captured; })",
  "[{ id: 1 }].filter(function(row) { return row.id === read(); })",
  "rows.map(function(row) { return row.id; })",
  "[...rows].map(function(row) { return row.id; })",
  "[{ id: 1 }].map(function named(row) { return row.id; })",
  "[{ id: 1 }].map(function(row, index) { return row.id; })",
  "[{ id: 1 }].map(function(row) { return row.id; }, owner)",
  "[{ id: 1 }].map((row) => { return row.id; })",
])("refuses unproven property callback semantics: %s", (expression) => {
  const source = `import { identity } from "@avandar/utils";\nexport const result = ${expression};`;
  expect(_fix({ source: source, enabled: [RULE_NAMES[0]] })).toBe(source);
});

it.each([
  "const result = [{ id: 1 }].map(function(row) { return row.id; });",
  "export const result = [{ id: 1 }].map(function(row) { return row.id; });",
  'import { identity } from "@avandar/utils"; const prop = 1; export const result = [{ id: 1 }].map(function(row) { return row.id; });',
  'import { identity } from "@avandar/utils"; consume(prop); export const result = [{ id: 1 }].map(function(row) { return row.id; });',
  'import { prop } from "@avandar/utils"; export function run(prop) { return [{ id: 1 }].map(function(row) { return row.id; }); }',
  'consume(); import { identity } from "@avandar/utils"; export const result = [{ id: 1 }].map(function(row) { return row.id; });',
  'import { /* keep */ identity } from "@avandar/utils"; export const result = [{ id: 1 }].map(function(row) { return row.id; });',
])("preserves scripts, execution order and import capture: %s", (source) => {
  expect(_fix({ source: source, enabled: [RULE_NAMES[0]] })).toBe(source);
});

it.each([
  [
    "export function build() { const result = { count: 0 }; result.count = 2; return result; }",
    "export function build() { const result = { count: 0 };  return { ...result, count: 2 }; }",
  ],
  [
    "export function build() { const result = { __proto__: null }; result.count = 2; result.ready = true; return result; }",
    "export function build() { const result = { __proto__: null };   return { __proto__: null, ...result, count: 2, ready: true }; }",
  ],
])(
  "folds fresh own-data construction without changing its descriptor: %s",
  (source, expected) => {
    expect(_fix({ source: source, enabled: [RULE_NAMES[1]] })).toBe(expected);
  },
);

it.each([
  "const result = {}; result.count = 2; return result;",
  "const result = { get count() { return 0; } }; result.count = 2; return result;",
  "const result = { count: 0 }; const alias = result; result.count = 2; return result;",
  "const result = { count: 0 }; if (flag) { result.count = 2; } return result;",
  "const result = { count: 0 }; consume(); result.count = 2; return result;",
  "const result = { count: 0 }; result.count = read(); return result;",
  "const result = { count: 0 }; result[key] = 2; return result;",
  "const result = { count: 0 }; if (flag) return result; result.count = 2; return result;",
  "const result = { count: 0 }; result.count = result.count + 1; return result;",
  "const result = { count: 0 }; result.count = 2; return { result };",
  "const result = { __proto__: null }; result.__proto__ = 2; return result;",
  "const result = { count: 0 }; /* keep */ result.count = 2; return result;",
])("refuses aliasing, accessors, branches and side effects: %s", (body) => {
  const source = `export function build() { ${body} }`;
  expect(_fix({ source: source, enabled: [RULE_NAMES[1]] })).toBe(source);
});

it("keeps untyped JavaScript optional candidates in fallback", () => {
  const source =
    'import { isDefined } from "@avandar/utils";\nexport function build(first) { const values = []; if (first !== undefined) {\n values.push(first);\n} return values; }';
  expect(_fix({ source: source, enabled: [RULE_NAMES[2]] })).toBe(source);
});

it("refuses competing new imports without relying on repeated fix passes", () => {
  const source =
    'import { identity } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });\nexport function build(first) { const values = []; if (first !== undefined) {\n  values.push(first);\n} return values; }';
  expect(_fix({ source: source })).toBe(source);
});

it.each([true, false])(
  "keeps import refusals stable after an existing-helper repair, enabled %s",
  (enabled) => {
    const source =
      'import { isDefined } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });\nexport function build(first) { const values = []; if (first !== undefined) {\n  values.push(first);\n} return values; }';
    const fixed = _fix({
      source: source,
      enabled: enabled ? RULE_NAMES : [RULE_NAMES[0]],
    });
    expect(fixed).toContain(".map(function(row) { return row.id; })");
    expect(fixed).not.toContain("isDefined, prop");
    expect(fixed.includes(".filter(isDefined)")).toBe(false);
  },
);

it.each(["let", "var"])(
  "folds an unreassigned %s local without editing its keyword",
  (kind) => {
    const source = `export function build() { ${kind} result = { count: 0 }; result.count = 2; return result; }`;
    expect(_fix({ source: source, enabled: [RULE_NAMES[1]] })).toBe(
      `export function build() { ${kind} result = { count: 0 };  return { ...result, count: 2 }; }`,
    );
  },
);

it("review R1 retains null comparisons that can infer filter predicates", () => {
  const source =
    'import { propEq } from "@avandar/utils";\nexport const result = [{ id: null }, { id: 1 }].filter(function(row) { return row.id === null; });';
  expect(_fix({ source: source, enabled: [RULE_NAMES[0]] })).toBe(source);
});
