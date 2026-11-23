import { expect, it } from "vitest";
import {
  evaluateUtilitySource,
  fixUtilitySource,
  getUtilityTypeDiagnosticsFromSource,
} from "./utilityFixers.fixtures";

const PREFIX: string = 'import { isDefined } from "@avandar/utils";\n';
const PARAMETERS: string =
  "first: number | null | undefined, second: number | null";
const DECLARATION: string = "const result: (number | null)[] = [];";
const GUARD: string = "if (first !== undefined) {\n  result.push(first);\n}";

function _source({
  body,
  parameters = PARAMETERS,
  context = "",
}: Readonly<{ body: string; parameters?: string; context?: string }>): string {
  return `${PREFIX}${context}\nexport function build(${parameters}) {\n  ${DECLARATION}\n  ${body}\n}`;
}

it("repairs typed candidates with the existing helper and preserves null, zero and order", () => {
  const source = _source({ body: `${GUARD}\n  return result;` });
  expect(getUtilityTypeDiagnosticsFromSource({ source: source })).toEqual({
    status: 0,
    diagnostics: "",
  });
  const fixed = fixUtilitySource({ source: source }).fixed;
  expect(fixed).toContain("[...result, first].filter(isDefined)");
  expect(getUtilityTypeDiagnosticsFromSource({ source: fixed })).toEqual({
    status: 0,
    diagnostics: "",
  });
  expect(evaluateUtilitySource({ source: fixed }).build!(undefined, 4)).toEqual(
    [],
  );
  expect(evaluateUtilitySource({ source: fixed }).build!(null, 4)).toEqual([
    null,
  ]);
  expect(evaluateUtilitySource({ source: fixed }).build!(0, 4)).toEqual([0]);
});

it.each([
  [
    "truthiness",
    "if (first) {\n  result.push(first);\n}\nreturn result;",
    "",
    PARAMETERS,
  ],
  [
    "loose null check",
    "if (first != null) {\n  result.push(first);\n}\nreturn result;",
    "",
    PARAMETERS,
  ],
  [
    "strict null check",
    "if (first !== null) {\n  result.push(first);\n}\nreturn result;",
    "",
    "first: number | null, second: number | null",
  ],
  [
    "mismatched candidate",
    "if (first !== undefined) {\n  result.push(second);\n}\nreturn result;",
    "",
    PARAMETERS,
  ],
  [
    "effect inside guard",
    "if (first !== undefined) {\n  consume();\n  result.push(first);\n}\nreturn result;",
    "declare function consume(): void;",
    PARAMETERS,
  ],
  [
    "effect after guard",
    `${GUARD}\nconsume();\nreturn result;`,
    "declare function consume(): void;",
    PARAMETERS,
  ],
  [
    "alias",
    `const alias = result;\n${GUARD}\nvoid alias;\nreturn result;`,
    "",
    PARAMETERS,
  ],
  [
    "alternate branch",
    "if (first !== undefined) {\n  result.push(first);\n} else {\n  return [];\n}\nreturn result;",
    "",
    PARAMETERS,
  ],
  [
    "member read",
    "if (source.first !== undefined) {\n  result.push(source.first);\n}\nreturn result;",
    "const source = { first: 1 };",
    PARAMETERS,
  ],
  [
    "external read",
    "if (globalValue !== undefined) {\n  result.push(globalValue);\n}\nreturn result;",
    "const globalValue: number | undefined = 1;",
    PARAMETERS,
  ],
  [
    "call read",
    "if (read() !== undefined) {\n  result.push(read());\n}\nreturn result;",
    "declare function read(): number;",
    PARAMETERS,
  ],
  ["different return", `${GUARD}\nreturn result.slice();`, "", PARAMETERS],
  [
    "early return",
    `${GUARD}\nif (second !== undefined) {\n  return [];\n}\nreturn result;`,
    "",
    PARAMETERS,
  ],
  [
    "unbraced guard",
    "if (first !== undefined) result.push(first);\nreturn result;",
    "",
    PARAMETERS,
  ],
] as const)(
  "refuses typed optional candidates with %s",
  (_reason, body, context, parameters) => {
    const source = _source({
      body: body,
      parameters: parameters,
      context: context,
    });
    expect(getUtilityTypeDiagnosticsFromSource({ source: source })).toEqual({
      status: 0,
      diagnostics: "",
    });
    expect(fixUtilitySource({ source: source }).fixed).toBe(source);
  },
);

it("retains JavaScript candidates even with the existing helper and multiline guard", () => {
  const source = `${PREFIX}export function build(first) {\n  const result = [];\n  ${GUARD}\n  return result;\n}`;
  expect(fixUtilitySource({ source: source, extension: "js" }).fixed).toBe(
    source,
  );
});
