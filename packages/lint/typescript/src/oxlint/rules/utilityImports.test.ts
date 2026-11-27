import { Linter } from "eslint";
import { expect, it } from "vitest";
import { getUtilityImportFromSource } from "./utilityImports";

function _fix({
  source,
  filename = "/project/src/file.js",
}: Readonly<{ source: string; filename?: string }>): string {
  const linter = new Linter();
  const rule = {
    meta: { fixable: "code" as const, schema: [] },
    create: (context: import("eslint").Rule.RuleContext) => {
      return {
        CallExpression: (node: import("estree").CallExpression) => {
          if (
            node.callee.type !== "Identifier" ||
            node.callee.name !== "replaceMe"
          ) {
            return;
          }
          const plan = getUtilityImportFromSource(
            context.sourceCode,
            node,
            "prop",
            filename,
          );
          if (!plan) {
            return;
          }
          context.report({
            node,
            message: "Use helper",
            fix: (fixer) => {
              return [
                fixer.replaceText(node, `${plan.localName}("id")`),
                ...plan.fix(fixer),
              ];
            },
          });
        },
      };
    },
  };
  const result = linter.verifyAndFix(source, [
    {
      plugins: { fixture: { rules: { helper: rule } } },
      rules: { "fixture/helper": "error" },
    },
  ]);
  expect(result.messages).toEqual([]);
  return result.output;
}

it.each([
  [
    'import { identity } from "@avandar/utils";\nreplaceMe();',
    'import { identity, prop } from "@avandar/utils";\nprop("id");',
  ],
  [
    'import { prop as pick } from "@avandar/utils";\nreplaceMe();',
    'import { prop as pick } from "@avandar/utils";\npick("id");',
  ],
  [
    'import "@avandar/utils";\nimport "second";\nreplaceMe();',
    'import { prop } from "@avandar/utils";\nimport "second";\nprop("id");',
  ],
  [
    'import { prop } from "@avandar/utils";\nreplaceMe();',
    'import { prop } from "@avandar/utils";\nprop("id");',
  ],
])(
  "keeps dependency order and reuses proven bindings: %s",
  (source, expected) => {
    expect(_fix({ source: source })).toBe(expected);
  },
);

it.each([
  "replaceMe();",
  "export {}; replaceMe();",
  'import "first"; replaceMe(); import "@avandar/utils";',
  'import "@avandar/utils"; const prop = 1; replaceMe();',
  'import "@avandar/utils"; use(prop); replaceMe();',
  'import { prop as pick } from "@avandar/utils"; function run(pick) { replaceMe(); }',
  'import "@avandar/utils"; function run(prop) { replaceMe(); }',
])(
  "refuses unavailable or captured imports without promoting scripts: %s",
  (source) => {
    expect(_fix({ source: source })).toBe(source);
  },
);

it.each([
  "/project/packages/shared/utils/src/example.js",
  "/project/node_modules/@avandar/utils/example.js",
])("refuses a utils self-import: %s", (filename) => {
  const source = 'import "@avandar/utils"; replaceMe();';
  expect(_fix({ source: source, filename: filename })).toBe(source);
});

it("preserves a default import binding instead of discarding it", () => {
  const source =
    'import utilities from "@avandar/utils"; utilities(); replaceMe();';
  expect(_fix({ source: source })).toBe(source);
});

it.each([
  'import "@avandar/utils"; const pr\\u006fp = 1; replaceMe();',
  'import "@avandar/utils"; consume(pr\\u006fp); replaceMe();',
  'import "@avandar/utils"; e\\u0076al("prop"); replaceMe();',
])(
  "refuses decoded lexical captures before introducing a helper binding: %s",
  (source) => {
    expect(_fix({ source: source })).toBe(source);
  },
);
