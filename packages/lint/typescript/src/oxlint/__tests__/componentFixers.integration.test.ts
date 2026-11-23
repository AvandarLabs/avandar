import { Linter } from "eslint";
import { expect, it } from "vitest";
import plugin from "../index";
import type { ESLint } from "eslint";

const LinterInstance: Linter = new Linter();
const config: Linter.Config[] = [
  {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { avandar: plugin as unknown as ESLint.Plugin },
    rules: {
      "avandar/local-e2e-casing": "error" as const,
      "avandar/jsx-conditional-ternary": "error" as const,
    },
  },
];

it.each([
  [
    "export {}; const myE2ECount = 2; consume(myE2ECount);",
    "export {}; const myE2eCount = 2; consume(myE2eCount);",
  ],
  [
    "export function read() { const myE2ECount = 2; return myE2ECount; }",
    "export function read() { const myE2eCount = 2; return myE2eCount; }",
  ],
  [
    "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}",
    "export function Card() {\n  return <Observer>{(!ready) ? <Node /> : false}</Observer>;\n}",
  ],
  [
    "export function Card() {\n  return <Observer>{count > 1 && <Node />}</Observer>;\n}",
    "export function Card() {\n  return <Observer>{(count > 1) ? <Node /> : false}</Observer>;\n}",
  ],
])(
  "exposes idempotent scope and boolean JSX fixes through the package export: %s",
  (source, expected) => {
    const result = LinterInstance.verifyAndFix(source, config);
    expect(result.messages).toEqual([]);
    expect(result.output).toBe(expected);
    expect(LinterInstance.verifyAndFix(result.output, config)).toMatchObject({
      fixed: false,
      output: result.output,
      messages: [],
    });
  },
);

it.each([
  "const myE2ECount = 2; consume(myE2ECount);",
  "export const myE2ECount = 2; consume(myE2ECount);",
  "export {}; const myE2ECount = 2; consume(myE2ECount + myE2eCount);",
  "export {}; const myE2ECount = 2; consume({ myE2ECount });",
  "export {}; const myE2ECount = 2; consume(object[myE2ECount]);",
  "export {}; const contract = 'myE2ECount'; const myE2ECount = 2; consume(myE2ECount);",
  "export function Card() { return <Observer>{count && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{0 && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{'' && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <Node value={read()} />}</Observer>; }",
])(
  "preserves unsupported contracts through the package export: %s",
  (source) => {
    expect(LinterInstance.verifyAndFix(source, config)).toMatchObject({
      fixed: false,
      output: source,
      messages: [],
    });
  },
);
