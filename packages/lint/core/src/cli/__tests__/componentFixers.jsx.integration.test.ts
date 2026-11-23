import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  collectComponentCoverage,
  createComponentRepository,
  evaluateComponentSource,
  fixComponentSource,
  getComponentTypeDiagnosticsFromSource,
  SAFE,
} from "./ComponentFixerTestHelpers";

it.each([
  "disabled",
  "source-disabled",
  "warning",
  "nested",
  "excluded",
  "missing-plugin",
  "malformed",
])("keeps component proofs in fallback when %s", async (reason) => {
  const directory = createComponentRepository();
  const path = join(
    directory,
    reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json",
  );
  const config =
    reason === "nested"
      ? {
          jsPlugins: [
            {
              name: "avandar",
              specifier: "@avandar/lint-typescript/oxlint",
            },
          ],
        }
      : JSON.parse(readFileSync(path, "utf8"));
  if (reason === "source-disabled") {
    writeFileSync(
      join(directory, "src/reviewed.tsx"),
      `/* eslint-disable ${SAFE.map(([, , name]) => {
        return `avandar/${name}`;
      }).join(", ")} */\nexport {};\n`,
    );
  } else if (reason === "excluded") {
    config.ignorePatterns.push("src/reviewed.tsx");
  } else if (reason === "missing-plugin") {
    config.jsPlugins = config.jsPlugins.filter((plugin: { name?: string }) => {
      return plugin.name !== "avandar";
    });
  } else {
    config.rules = Object.fromEntries(
      SAFE.map(([, , name]) => {
        return [`avandar/${name}`, reason === "warning" ? "warn" : "off"];
      }),
    );
    config.overrides = [];
  }
  writeFileSync(
    path,
    reason === "malformed" ? "{ invalid" : JSON.stringify(config),
  );
  const result = await collectComponentCoverage({
    directory: directory,
    extension: "tsx",
    status: ["missing-plugin", "malformed"].includes(reason) ? 1 : 0,
  });
  SAFE.forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId, capability, state: "fallback" }),
    );
  });
});

it.each([
  [
    "export {};\ntype CardProps = { rows: Array<number> };\nexport function Card(props: CardProps): unknown { return <div />; }",
    "export {};\ntype CardProps = { rows: number[] };\nexport function Card(props: CardProps): unknown { return <div />; }",
  ],
  [
    "export {};\ntype CardProps = { count: number };\n/**\n * Show the count.\n */\nexport function Card(props: CardProps): unknown { return <div />; }",
    "export {};\ntype CardProps = { count: number };\n/** Show the count. */\nexport function Card(props: CardProps): unknown { return <div />; }",
  ],
  [
    "export {};\ntype CardProps = { value: number };\nconst _read = function() { return 1; };\n_read();\nexport function Card(props: CardProps): unknown { return <div />; }",
    "export {};\ntype CardProps = { value: number };\nfunction _read() { return 1; }\n_read();\nexport function Card(props: CardProps): unknown { return <div />; }",
  ],
])(
  "keeps props envelopes outside native, comment, and function repairs: %s",
  (source, expected) => {
    expect(
      fixComponentSource({
        source: source,
        extension: "tsx",
        rules: undefined,
        root: true,
      }),
    ).toBe(expected);
  },
);

it("composes props and JSX fixes with independent native and comment repairs", () => {
  const source = [
    "const _read = function() { return 1; }; _read();",
    "export function count(): number { const myE2ECount = 2; return myE2ECount; }",
    "type CardProps = { ready: boolean };",
    "export function Card(props: CardProps): unknown {",
    "  /** Show it once. */",
    "  if (flag) consume();",
    "  return <Observer>{!ready && <Node />}</Observer>;",
    "}",
  ].join("\n");
  expect(
    fixComponentSource({
      source: source,
      extension: "tsx",
      rules: undefined,
      root: true,
    }),
  ).toBe(
    [
      "function _read() { return 1; } _read();",
      "export function count(): number { const myE2eCount = 2; return myE2eCount; }",
      "type Props = { ready: boolean };",
      "export function Card(props: Props): unknown {",
      "  // Show it once.",
      "  if (flag) {consume();}",
      "  return <Observer>{(!ready) ? <Node /> : false}</Observer>;",
      "}",
    ].join("\n"),
  );
});

it("preserves comparison coercion count and precise child values", () => {
  const source =
    "export function Card() { return <Observer>{candidate > threshold && <Node />}</Observer>; }";
  const fixed = fixComponentSource({
    source: source,
    extension: "tsx",
    rules: ["jsx-conditional-ternary"],
  });
  let coercions = 0;
  const candidate = {
    valueOf: () => {
      coercions++;
      return 2;
    },
  };
  expect(
    evaluateComponentSource({
      source: fixed,
      context: { candidate, threshold: 1 },
    }),
  ).toBe("rendered-node");
  expect(coercions).toBe(1);
  expect(
    evaluateComponentSource({
      source: fixed,
      context: { candidate, threshold: 3 },
    }),
  ).toBe(false);
  expect(coercions).toBe(2);
});

it.each(SAFE)(
  "leaves %s unchanged when only the other component rules are enabled",
  (_ruleId, _capability, disabled) => {
    const sources: Record<string, string> = {
      "component-props-name":
        "type CardProps = {}; export function Card(props: CardProps) { return <div />; }",
      "local-e2e-casing":
        "export function read() { const myE2ECount = 2; return myE2ECount; }",
      "jsx-conditional-ternary":
        "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}",
    };
    const enabled = SAFE.map(([, , name]) => {
      return name;
    }).filter((name) => {
      return name !== disabled;
    });
    expect(
      fixComponentSource({
        source: sources[disabled]!,
        extension: "tsx",
        rules: enabled,
      }),
    ).toBe(sources[disabled]);
  },
);

it("renames a one-letter component props prefix", () => {
  expect(
    fixComponentSource({
      source:
        "export {}; type AProps = { count: number }; export function A(props: AProps) { return <div />; }",
    }),
  ).toBe(
    "export {}; type Props = { count: number }; export function A(props: Props) { return <div />; }",
  );
});

it("keeps local rename envelopes outside native type annotation repairs", () => {
  const source =
    "export {};\nconst myE2ECount: Array<number> = 2;\nconsume(myE2ECount);";
  expect(
    fixComponentSource({
      source: source,
      extension: "ts",
      rules: undefined,
      root: true,
    }),
  ).toBe("export {};\nconst myE2ECount: number[] = 2;\nconsume(myE2ECount);");
});

it("preserves zero compiler diagnostics after a props alias rename", () => {
  const source =
    "export {}; type CardProps = { count: number }; export function Card(props: CardProps) { return <div>{props.count}</div>; }";
  expect(getComponentTypeDiagnosticsFromSource(source)).toEqual({
    status: 0,
    diagnostics: "",
  });
  const fixed = fixComponentSource({ source: source });
  expect(fixed).not.toBe(source);
  expect(getComponentTypeDiagnosticsFromSource(fixed)).toEqual({
    status: 0,
    diagnostics: "",
  });
});

it.each(["ts", "js", "cjs"])(
  "preserves script bindings that may be read by another file for %s",
  (extension) => {
    const source = "const myE2ECount = 2; consume(myE2ECount);";
    expect(
      fixComponentSource({
        source: source,
        extension: extension,
        rules: ["local-e2e-casing"],
      }),
    ).toBe(source);
  },
);

it.each(["ts", "js"])(
  "renames a module-private top-level acronym binding for %s",
  (extension) => {
    expect(
      fixComponentSource({
        source: "export {}; const myE2ECount = 2; consume(myE2ECount);",
        extension: extension,
        rules: ["local-e2e-casing"],
      }),
    ).toBe("export {}; const myE2eCount = 2; consume(myE2eCount);");
  },
);
