import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  collectComponentCoverage,
  createComponentRepository,
  fixComponentSource,
  SAFE,
} from "./ComponentFixerTestHelpers";

/** Capabilities that require the module context witness. */
const MODULE_ONLY = [
  ["AF-08", "direct-top-level-calls"],
  ["AF-09", "direct-nested-calls"],
  ["AF-10", "private-direct-calls"],
] as const;

it("preserves props aliases in scripts with possible cross-file type references", () => {
  const source =
    "type CardProps = { count: number }; function Card(props: CardProps) { return <div />; }";
  expect(
    fixComponentSource({
      source: source,
      extension: "tsx",
      rules: ["component-props-name"],
    }),
  ).toBe(source);
});

it("keeps a JSX child unchanged when its ternary would exceed the root line limit", () => {
  const source = [
    "export function Card(): unknown {",
    "  return <Observer>{someLongConditionName !== null && <Node />}</Observer>;",
    "}",
  ].join("\n");
  expect(
    fixComponentSource({
      source: source,
      extension: "tsx",
      rules: undefined,
      root: true,
    }),
  ).toBe(source);
});

it.each(["ts", "tsx", "js", "jsx"])(
  "keeps module-only capabilities in fallback for an original %s script",
  async (extension) => {
    const directory = createComponentRepository(extension);
    writeFileSync(
      join(directory, `src/reviewed.${extension}`),
      "const externalValue = 1; consume(externalValue);\n",
    );
    const result = await collectComponentCoverage({
      directory: directory,
      extension: extension,
    });
    [
      ...MODULE_ONLY,
      ...SAFE.filter(([ruleId]) => {
        return ruleId === "AF-12" && extension === "tsx";
      }),
    ].forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "fallback",
        }),
      );
    });
  },
);

it.each(["const marker = 'export {};';", "/* export {}; */"])(
  "keeps module-only proofs in fallback for a textual module marker: %s",
  async (source) => {
    const directory = createComponentRepository();
    writeFileSync(join(directory, "src/reviewed.tsx"), `${source}\n`);
    const result = await collectComponentCoverage({ directory: directory });
    [...MODULE_ONLY, SAFE[0]].forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({
          ruleId,
          capability,
          state: "fallback",
        }),
      );
    });
  },
);

it("keeps the props capability in fallback when the original module already has a component", async () => {
  const directory = createComponentRepository();
  writeFileSync(
    join(directory, "src/reviewed.tsx"),
    "export function Existing(): unknown { return <div />; }\n",
  );
  const result = await collectComponentCoverage({ directory: directory });
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-12",
      capability: "single-component-props",
      state: "fallback",
    }),
  );
});

it.each([
  "const Other = () => <span />;",
  "class Other { render() { return <span />; } }",
  "function other() { return <span />; }",
])("preserves props when another JSX owner exists: %s", (other) => {
  const source = `export {}; ${other} type CardProps = { count: number }; export function Card(props: CardProps) { return <div />; }`;
  expect(
    fixComponentSource({
      source: source,
      extension: "tsx",
      rules: ["component-props-name"],
    }),
  ).toBe(source);
});

it("keeps props proof in fallback for an original arrow component", async () => {
  const directory = createComponentRepository();
  writeFileSync(
    join(directory, "src/reviewed.tsx"),
    "export const Existing = () => <div />;\n",
  );
  const result = await collectComponentCoverage({ directory: directory });
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-12",
      capability: "single-component-props",
      state: "fallback",
    }),
  );
});
