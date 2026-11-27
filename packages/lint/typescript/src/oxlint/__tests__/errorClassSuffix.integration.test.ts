import { Linter } from "eslint";
import { expect, it } from "vitest";
import plugin from "../index";
import type { ESLint } from "eslint";

const LinterInstance: Linter = new Linter();
const config: Linter.Config[] = [
  {
    plugins: { avandar: plugin as unknown as ESLint.Plugin },
    rules: { "avandar/error-class-suffix": "error" as const },
  },
];

function _getMessages(source: string): string[] {
  return LinterInstance.verify(source, config).map(({ message }) => {
    return message;
  });
}

it.each([
  "export class Denied extends Error {}",
  "export class Denied extends PluginError {}",
  "export class Denied extends errors.ValidationError {}",
  "export default class Denied extends TypeError {}",
  "export const Denied = class Denied extends Error {};",
])("reports an Error subclass without the suffix: %s", (source) => {
  expect(_getMessages(source)).toEqual([
    "avlint-ts-017: Name this Error subclass `DeniedError`.",
  ]);
});

it.each([
  "export class DeniedError extends Error {}",
  "export class DeniedError extends PluginError {}",
  "export class Denied extends Base {}",
  "export class Denied extends ErrorBoundary {}",
  "export class Denied {}",
  "export const Denied = class extends Error {};",
])("ignores classes outside the convention: %s", (source) => {
  expect(_getMessages(source)).toEqual([]);
});

it("renames a module-private class and every reference to it", () => {
  const source = [
    "export {};",
    "class Denied extends Error {}",
    "export function check(error) {",
    "  if (error instanceof Denied) {",
    "    throw new Denied();",
    "  }",
    "}",
  ].join("\n");
  const result = LinterInstance.verifyAndFix(source, config);
  expect(result.messages).toEqual([]);
  expect(result.output).toBe(source.replaceAll("Denied", "DeniedError"));
});

it.each([
  "export class Denied extends Error {}",
  "class Denied extends Error {} export { Denied };",
  "class Denied extends Error {} export default Denied;",
  'class Denied extends Error { constructor() { super(); this.name = "Denied"; } } consume(Denied);',
  "class Denied extends Error {} const DeniedError = 1; consume(Denied, DeniedError);",
  "class Denied extends Error {} consume(Denied.name);",
  "class Denied extends Error {} consume({ Denied });",
])(
  "reports without fixing when a rename could escape the file: %s",
  (source) => {
    const result = LinterInstance.verifyAndFix(source, config);
    expect(result.output).toBe(source);
    expect(
      result.messages.map(({ message }) => {
        return message;
      }),
    ).toEqual(["avlint-ts-017: Name this Error subclass `DeniedError`."]);
  },
);
