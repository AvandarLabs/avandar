import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../../../src/cli/main";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
const SAFE = [
  ["AF-12", "single-component-props", "component-props-name"],
  ["AF-13", "local-primitive-bindings", "local-e2e-casing"],
  ["AF-14", "boolean-jsx-children", "jsx-conditional-ternary"],
] as const;

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _createRepository(extension = "tsx") {
  const directory = mkdtempSync(join(tmpdir(), "component-coverage-"));
  directories.push(directory);
  ["node_modules", "eslint"].forEach((name) => {
    symlinkSync(join(ROOT, name), join(directory, name));
  });
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(join(directory, "package.json"), JSON.stringify({
    scripts: { lint: "oxlint --report-unused-disable-directives-severity=error ." },
  }));
  writeFileSync(join(directory, ".oxlintrc.json"), readFileSync(join(ROOT, ".oxlintrc.json")));
  writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, module: "preserve", jsx: "react-jsx" },
    include: ["src"],
  }));
  writeFileSync(join(directory, `src/reviewed.${extension}`), "export {};\n");
  return directory;
}

function _fix(source: string, extension = "tsx", rules: string[] = SAFE.map(([, , name]) => { return name; }), root = false) {
  const directory = _createRepository(extension);
  const path = join(directory, `src/reviewed.${extension}`);
  const config = JSON.parse(readFileSync(join(directory, ".oxlintrc.json"), "utf8"));
  if (!root) {
    config.rules = Object.fromEntries(rules.map((name) => { return [`avandar/${name}`, "error"]; }));
    config.overrides = [];
    config.options = {};
  }
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  writeFileSync(path, source);
  const run = () => { return spawnSync(join(ROOT, "node_modules/.bin/oxlint"),
    ["--fix", `src/reviewed.${extension}`], { cwd: directory, encoding: "utf8" }); };
  const first = run();
  expect(first.error, first.stdout + first.stderr).toBeUndefined();
  expect(first.status, first.stdout + first.stderr).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

it("renames a private alias used only by the sole component parameter", () => {
  expect(_fix("export {}; type CardProps = { count: number }; export function Card(props: CardProps) { return <div>{props.count}</div>; }"))
    .toBe("export {}; type Props = { count: number }; export function Card(props: Props) { return <div>{props.count}</div>; }");
});

it.each([
  "export type CardProps = { count: number }; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export { CardProps }; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; type Props = {}; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card<Props>(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } export function Other() { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } function read(props: CardProps) { return props; }",
  "type CardProps<T> = { value: T }; export function Card(props: CardProps<number>) { return <div />; }",
  "interface CardProps {} export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; const key = 'CardProps'; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export const Card = (props: CardProps) => <div />;",
  "type CardProps = {}; export function read(props: CardProps) { return props; }",
  "type CardProps = {}; const read = <T extends CardProps>(props: T) => props; export function Card(props: CardProps) { return <div />; }",
  "type CardProps = {}; export function Card(props: CardProps) { return <div />; } export type Public = CardProps;",
])("preserves unsupported props contracts: %s", (source) => {
  const moduleSource = `export {}; ${source}`;
  expect(_fix(moduleSource)).toBe(moduleSource);
});

it("renames a primitive local binding and its resolved reads", () => {
  expect(_fix("export function read(): number { const myE2ECount = 2; return myE2ECount + myE2ECount; }", "ts"))
    .toBe("export function read(): number { const myE2eCount = 2; return myE2eCount + myE2eCount; }");
});

it.each([
  "export const myE2ECount = 2; consume(myE2ECount);",
  "const myE2ECount = 2; export { myE2ECount };",
  "const E2E_GOOGLE_SHEET_ID = 'sheet'; consume(E2E_GOOGLE_SHEET_ID);",
  "const myE2eCount = 2; consume(myE2eCount);",
  "const e2eCount = 2; consume(e2eCount);",
  "const myE2ECount = 2; const myE2eCount = 3; consume(myE2ECount);",
  "const myE2ECount = 2; consume(myE2ECount + myE2eCount);",
  "const myE2ECount = 2; consume({ myE2ECount });",
  "const myE2ECount = 2; consume({ [myE2ECount]: 1 });",
  "const myE2ECount = 2; consume(object[myE2ECount]);",
  "const myE2ECount = 2; const contract = 'myE2ECount'; consume(myE2ECount);",
  "const contract = 'myE2ECount'; const myE2ECount = 2; consume(myE2ECount);",
  "const contract = 'myE2E\\u0043ount'; const myE2ECount = 2; consume(myE2ECount);",
  "const myE2ECount = 2; eval(code); consume(myE2ECount);",
  "const myE2ECount = function() { return 2; }; consume(myE2ECount.name);",
  "function myE2ECount() { return myE2ECount(); } consume(myE2ECount);",
  "const myE2ECount = { get value() { return 2; } }; consume(myE2ECount.value);",
  "let myE2ECount = 2; myE2ECount = 3; consume(myE2ECount);",
  "const myE2ECount = 2; consume(() => myE2ECount);",
  "export function read() { const myE2ECount = 2; if (flag) return myE2ECount; return 0; }",
  "const myE2ECount = 2; consume(); consume(myE2ECount);",
])("preserves unsupported acronym contracts: %s", (source) => {
  const moduleSource = `export {}; ${source}`;
  expect(_fix(moduleSource, "ts", ["local-e2e-casing"]))
    .toBe(moduleSource);
});

it("keeps local acronym renames inside their own shadowed scopes", () => {
  const source = "const myE2ECount = 9; export function read(): number { const myE2ECount = 2; return myE2ECount; }";
  const fixed = _fix(source, "ts", ["local-e2e-casing"]);
  expect(fixed).toBe(source.replace("const myE2ECount = 2; return myE2ECount", "const myE2eCount = 2; return myE2eCount"));
});

it.each(["tsx", "jsx"])("replaces a boolean child with an exact false-arm ternary for %s", (extension) => {
  expect(_fix("export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}", extension))
    .toBe("export function Card() {\n  return <Observer>{(!ready) ? <Node /> : false}</Observer>;\n}");
});

it.each([
  "export function Card() { return <Observer>{count && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{0 && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{'' && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{read() && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{object.ready && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{!object.ready && <Node />}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <Node value={read()} />}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <><Node /></>}</Observer>; }",
  "export function Card() { return <Observer>{!ready && <Node>{!other && <Child />}</Node>}</Observer>; }",
  "export function Card() { return <Observer>{!ready /* keep */ && <Node />}</Observer>; }",
  "export const Card = () => <Observer>{!ready && <Node />}</Observer>;",
])("preserves unsupported JSX evaluation shapes: %s", (source) => {
  expect(_fix(source, "tsx", ["jsx-conditional-ternary"])).toBe(source);
});

function _evaluate(source: string, context: Record<string, unknown>) {
  const script = ts.transpileModule(source.replace("export ", ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext },
  }).outputText;
  return runInNewContext(`${script}\nCard();`, {
    ...context, Observer: "observer", Node: "node",
    React: { createElement: (
      type: unknown, props: unknown, children: unknown,
    ) => { return type === "observer" ? children : "rendered-node"; } },
  });
}

it.each([false, true, 0, "", null, undefined, {}, { valueOf: () => { throw Error("coercion"); } }])(
  "preserves the precise child value and single condition read for %s", (value) => {
    const source = "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}";
    const fixed = _fix(source, "tsx", ["jsx-conditional-ternary"]);
    expect(fixed).not.toBe(source);
    let reads = 0;
    const context = Object.defineProperty({}, "ready", { enumerable: true, get: () => { reads++; return value; } });
    // A getter on the VM global records every identifier evaluation.
    const execute = (text: string) => {
      const script = ts.transpileModule(text.replace("export ", ""), {
        compilerOptions: {
          jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext,
        },
      }).outputText;
      Object.assign(context, { Observer: "observer", Node: "node", React: {
        createElement: (type: unknown, props: unknown, children: unknown) => {
          return type === "observer" ? children : "rendered-node";
        },
      } });
      return runInNewContext(`${script}\nCard();`, context);
    };
    expect(execute(fixed)).toBe(execute(source));
    expect(reads).toBe(2);
  },
);

it.each([0, "", false, null, undefined])("retains unproven scalar children exactly: %s", (value) => {
  const source = "export function Card() { return <Observer>{count && <Node />}</Observer>; }";
  const fixed = _fix(source, "tsx", ["jsx-conditional-ternary"]);
  expect(_evaluate(fixed, { count: value })).toBe(value);
});

async function _coverage(directory: string, extension = "tsx", status = 0) {
  const stdout: string[] = [];
  const code = await runCli([
    "coverage", `src/reviewed.${extension}`, "--format", "json", "--no-prompt",
  ], {
    cwd: directory,
    stdout: (value) => { stdout.push(value); }, stderr: () => {},
  });
  expect(code).toBe(status);
  return JSON.parse(stdout.join(""));
}

it.each(["tsx", "jsx", "ts", "js"])("proves only file-syntax-specific component capabilities for %s", async (extension) => {
  const directory = _createRepository(extension);
  const result = await _coverage(directory, extension);
  SAFE.forEach(([ruleId, capability]) => {
    if (ruleId === "AF-12" && ["jsx", "js"].includes(extension)) {
      return;
    }
    const supported = ruleId === "AF-13" ||
      (ruleId === "AF-12" ? extension === "tsx" : ["tsx", "jsx"].includes(extension));
    expect(result.outcomes).toContainEqual(expect.objectContaining({
      ruleId, capability, state: supported ? "enforced" : "fallback",
    }));
    expect(result.outcomes).toContainEqual(expect.objectContaining({
      ruleId, capability: "unsupported-shapes", state: "fallback",
    }));
    expect(result.summaries).toContainEqual(expect.objectContaining({ ruleId, state: "fallback" }));
  });
  expect(readFileSync(join(directory, `src/reviewed.${extension}`), "utf8")).toBe("export {};\n");
});

it.each(["disabled", "source-disabled", "warning", "nested", "excluded", "missing-plugin", "malformed"])(
  "keeps component proofs in fallback when %s", async (reason) => {
    const directory = _createRepository();
    const path = join(directory, reason === "nested" ? "src/.oxlintrc.json" : ".oxlintrc.json");
    const config = reason === "nested" ? { jsPlugins: [{
      name: "avandar", specifier: "@avandar/lint-typescript/oxlint",
    }] } : JSON.parse(readFileSync(path, "utf8"));
    if (reason === "source-disabled") {
      writeFileSync(join(directory, "src/reviewed.tsx"),
        `/* eslint-disable ${SAFE.map(([, , name]) => { return `avandar/${name}`; }).join(", ")} */\nexport {};\n`);
    } else if (reason === "excluded") {
      config.ignorePatterns.push("src/reviewed.tsx");
    } else if (reason === "missing-plugin") {
      config.jsPlugins = config.jsPlugins.filter(
        (plugin: { name?: string }) => { return plugin.name !== "avandar"; },
      );
    } else {
      config.rules = Object.fromEntries(SAFE.map(([, , name]) => {
        return [`avandar/${name}`, reason === "warning" ? "warn" : "off"];
      }));
      config.overrides = [];
    }
    writeFileSync(path, reason === "malformed" ? "{ invalid" : JSON.stringify(config));
    const result = await _coverage(directory, "tsx", ["missing-plugin", "malformed"].includes(reason) ? 1 : 0);
    SAFE.forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(expect.objectContaining({ ruleId, capability, state: "fallback" }));
    });
  },
);

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
])("keeps props envelopes outside native, comment, and function repairs: %s", (source, expected) => {
  expect(_fix(source, "tsx", undefined, true)).toBe(expected);
});

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
  expect(_fix(source, "tsx", undefined, true)).toBe([
    "function _read() { return 1; } _read();",
    "export function count(): number { const myE2eCount = 2; return myE2eCount; }",
    "type Props = { ready: boolean };",
    "export function Card(props: Props): unknown {",
    "  // Show it once.",
    "  if (flag) {consume();}",
    "  return <Observer>{(!ready) ? <Node /> : false}</Observer>;",
    "}",
  ].join("\n"));
});

it("preserves comparison coercion count and precise child values", () => {
  const source = "export function Card() { return <Observer>{candidate > threshold && <Node />}</Observer>; }";
  const fixed = _fix(source, "tsx", ["jsx-conditional-ternary"]);
  let coercions = 0;
  const candidate = { valueOf: () => { coercions++; return 2; } };
  expect(_evaluate(fixed, { candidate, threshold: 1 })).toBe("rendered-node");
  expect(coercions).toBe(1);
  expect(_evaluate(fixed, { candidate, threshold: 3 })).toBe(false);
  expect(coercions).toBe(2);
});

it.each(SAFE)("leaves %s unchanged when only the other component rules are enabled", (ruleId, capability, disabled) => {
  const sources: Record<string, string> = {
    "component-props-name": "type CardProps = {}; export function Card(props: CardProps) { return <div />; }",
    "local-e2e-casing": "export function read() { const myE2ECount = 2; return myE2ECount; }",
    "jsx-conditional-ternary": "export function Card() {\n  return <Observer>{!ready && <Node />}</Observer>;\n}",
  };
  const enabled = SAFE.map(([, , name]) => { return name; }).filter((name) => {
    return name !== disabled;
  });
  expect(_fix(sources[disabled], "tsx", enabled)).toBe(sources[disabled]);
});

it("renames a one-letter component props prefix", () => {
  expect(_fix("export {}; type AProps = { count: number }; export function A(props: AProps) { return <div />; }"))
    .toBe("export {}; type Props = { count: number }; export function A(props: Props) { return <div />; }");
});

it("keeps local rename envelopes outside native type annotation repairs", () => {
  const source = "export {};\nconst myE2ECount: Array<number> = 2;\nconsume(myE2ECount);";
  expect(_fix(source, "ts", undefined, true))
    .toBe("export {};\nconst myE2ECount: number[] = 2;\nconsume(myE2ECount);");
});

function _getTypeDiagnostics(source: string) {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      strict: true, noEmit: true, module: "preserve", target: "ESNext",
      jsx: "react-jsx", types: [], skipLibCheck: true,
    },
    include: ["src"],
  }));
  const result = spawnSync(join(ROOT, "node_modules/.bin/tsc"),
    ["--project", directory, "--pretty", "false"],
    { cwd: directory, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  return { status: result.status, diagnostics: result.stdout + result.stderr };
}

it("preserves zero compiler diagnostics after a props alias rename", () => {
  const source = "export {}; type CardProps = { count: number }; export function Card(props: CardProps) { return <div>{props.count}</div>; }";
  expect(_getTypeDiagnostics(source)).toEqual({ status: 0, diagnostics: "" });
  const fixed = _fix(source);
  expect(fixed).not.toBe(source);
  expect(_getTypeDiagnostics(fixed)).toEqual({ status: 0, diagnostics: "" });
});

it.each(["ts", "js", "cjs"])("preserves script bindings that may be read by another file for %s", (extension) => {
  const source = "const myE2ECount = 2; consume(myE2ECount);";
  expect(_fix(source, extension, ["local-e2e-casing"])).toBe(source);
});

it.each(["ts", "js"])("renames a module-private top-level acronym binding for %s", (extension) => {
  expect(_fix("export {}; const myE2ECount = 2; consume(myE2ECount);", extension, ["local-e2e-casing"]))
    .toBe("export {}; const myE2eCount = 2; consume(myE2eCount);");
});

it("preserves props aliases in scripts with possible cross-file type references", () => {
  const source = "type CardProps = { count: number }; function Card(props: CardProps) { return <div />; }";
  expect(_fix(source, "tsx", ["component-props-name"])).toBe(source);
});

it("keeps a JSX child unchanged when its ternary would exceed the root line limit", () => {
  const source = [
    "export function Card(): unknown {",
    "  return <Observer>{someLongConditionName !== null && <Node />}</Observer>;",
    "}",
  ].join("\n");
  expect(_fix(source, "tsx", undefined, true)).toBe(source);
});

it.each(["ts", "tsx", "js", "jsx"])("keeps module-only capabilities in fallback for an original %s script", async (extension) => {
  const directory = _createRepository(extension);
  writeFileSync(join(directory, `src/reviewed.${extension}`),
    "const externalValue = 1; consume(externalValue);\n");
  const result = await _coverage(directory, extension);
  SAFE.filter(([ruleId]) => {
    return ruleId === "AF-13" || (ruleId === "AF-12" && extension === "tsx");
  }).forEach(([ruleId, capability]) => {
    expect(result.outcomes).toContainEqual(expect.objectContaining({
      ruleId, capability, state: "fallback",
    }));
  });
});

it("does not treat a later module marker as a preceding rename boundary", () => {
  const source = "const myE2ECount = 2; consume(myE2ECount); export {};";
  expect(_fix(source, "ts", ["local-e2e-casing"])).toBe(source);
});

it.each(["const marker = 'export {};';", "/* export {}; */"])(
  "keeps module-only proofs in fallback for a textual module marker: %s", async (source) => {
    const directory = _createRepository();
    writeFileSync(join(directory, "src/reviewed.tsx"), `${source}\n`);
    const result = await _coverage(directory);
    SAFE.slice(0, 2).forEach(([ruleId, capability]) => {
      expect(result.outcomes).toContainEqual(expect.objectContaining({
        ruleId, capability, state: "fallback",
      }));
    });
  },
);

it("keeps the props capability in fallback when the original module already has a component", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.tsx"),
    "export function Existing(): unknown { return <div />; }\n");
  const result = await _coverage(directory);
  expect(result.outcomes).toContainEqual(expect.objectContaining({
    ruleId: "AF-12", capability: "single-component-props", state: "fallback",
  }));
});

it.each([
  "const Other = () => <span />;",
  "class Other { render() { return <span />; } }",
  "function other() { return <span />; }",
])("preserves props when another JSX owner exists: %s", (other) => {
  const source = `export {}; ${other} type CardProps = { count: number }; export function Card(props: CardProps) { return <div />; }`;
  expect(_fix(source, "tsx", ["component-props-name"])).toBe(source);
});

it("keeps props proof in fallback for an original arrow component", async () => {
  const directory = _createRepository();
  writeFileSync(join(directory, "src/reviewed.tsx"),
    "export const Existing = () => <div />;\n");
  const result = await _coverage(directory);
  expect(result.outcomes).toContainEqual(expect.objectContaining({
    ruleId: "AF-12", capability: "single-component-props", state: "fallback",
  }));
});
