import { Linter } from "eslint";
import { expect, it } from "vitest";
import plugin from "../index";
import type { ESLint } from "eslint";

const LinterInstance: Linter = new Linter();
const config: Linter.Config[] = [
  {
    plugins: { avandar: plugin as unknown as ESLint.Plugin },
    rules: { "avandar/module-context-witness": "error" as const },
  },
];

it.each([
  "import x from 'x';\nconst _avandarCoverage0ModuleContext = 1;",
  "export {};\nconst _avandarCoverage3ModuleContext = 1;",
])("reports the seed binding after an original module marker: %s", (source) => {
  expect(
    LinterInstance.verify(source, config).map(({ message }) => {
      return message;
    }),
  ).toEqual(["Module context: original module marker found."]);
});

it.each([
  "const _avandarCoverage0ModuleContext = 1;",
  "const _avandarCoverage0ModuleContext = 1;\nexport {};",
  "// export {};\nconst _avandarCoverage0ModuleContext = 1;",
  "const marker = 'export {};';\nconst _avandarCoverage0ModuleContext = 1;",
  "export {};\nconst authoredModuleContext = 1;",
  "export {};\nfunction read() { const _avandarCoverage0ModuleContext = 1; }",
])("stays silent without a preceding original marker: %s", (source) => {
  expect(LinterInstance.verify(source, config)).toEqual([]);
});
