import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _fix({
  source,
  extension = "ts",
  unfixedRule,
}: Readonly<{
  source: string;
  extension?: string;
  unfixedRule?: string;
}>): string {
  const directory = mkdtempSync(join(tmpdir(), "native-safe-"));
  directories.push(directory);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, module: "preserve", noEmit: true },
      include: ["**/*.ts", "**/*.js"],
    }),
  );
  writeFileSync(
    join(directory, "target.ts"),
    "export interface Shape { name: string }\nexport const value = 1;\n",
  );
  const path = join(directory, `fixture.${extension}`);
  writeFileSync(path, source);
  const run = () => {
    return spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--config", join(ROOT, ".oxlintrc.json"), "--fix", path],
      { cwd: directory, encoding: "utf8" },
    );
  };
  const first = run();
  expect(first.error, first.stderr).toBeUndefined();
  expect(first.status, `${first.stdout}${first.stderr}`).toBe(
    unfixedRule ? 1 : 0,
  );
  if (unfixedRule) {
    expect(first.stdout).toContain(unfixedRule);
    expect(first.status).toBe(1);
  }
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.error, second.stderr).toBeUndefined();
  expect(second.status, `${second.stdout}${second.stderr}`).toBe(
    unfixedRule ? 1 : 0,
  );
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

/** Native safe fixes use repository configuration without suggestions. */
describe("native safe fixes", () => {
  it.each(["ts", "tsx", "js", "jsx"])("adds if braces in %s", (extension) => {
    expect(
      _fix({ source: "if (enabled) consume();\n", extension: extension }),
    ).toBe("if (enabled) {consume();}\n");
  });
  it.each(["ts", "tsx", "js", "jsx"])(
    "preserves concatenation in AF-02 fallback in %s",
    (extension) => {
      expect(
        _fix({
          source: 'const message = "hello " + name;\n',
          extension: extension,
        }),
      ).toBe('const message = "hello " + name;\n');
    },
  );
  it("marks type-only imports", () => {
    expect(
      _fix({
        source:
          'import { Shape } from "./target";\nconst shape: Shape = { name: "a" };\n',
      }),
    ).toContain('import type { Shape } from "./target";');
  });
  it("marks type-only exports using native project types", () => {
    expect(
      _fix({ source: "type Shape = { name: string };\nexport { Shape };\n" }),
    ).toContain("export type { Shape };");
  });
  it("replaces eligible literal assertions", () => {
    expect(_fix({ source: 'const label = "label" as "label";\n' })).toBe(
      'const label = "label" as const;\n',
    );
  });
  it("leaves assertion repair in root fallback", () => {
    expect(
      _fix({
        source: "const count: number = 1;\nconst copy = count as number;\n",
      }),
    ).toBe("const count: number = 1;\nconst copy = count as number;\n");
  });
  it("leaves AF-19 repair in fallback because native extensions has no fixer", () => {
    expect(
      _fix({
        source: 'import { value } from "./target.ts";\n\nconsole.log(value);\n',
        extension: "ts",
        unfixedRule: "import(extensions)",
      }),
    ).toContain('from "./target.ts";');
  });
  it.each([
    "const count = 1 + 2;\n",
    "const value = unknownValue as number;\n",
    'import { value } from "missing-package";\n',
    'const label = "label" as string;\n',
  ])("preserves unsupported or already valid syntax %s", (source) => {
    expect(_fix({ source: source })).toBe(source);
  });
});

function _typeErrors(path: string): number[] {
  return ts
    .getPreEmitDiagnostics(
      ts.createProgram([path], {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.Preserve,
      }),
    )
    .map((diagnostic) => {
      return diagnostic.code;
    });
}

function _nativeAssertionFix(source: string): {
  before: number[];
  after: number[];
  fixed: string;
} {
  const directory = mkdtempSync(join(tmpdir(), "native-assertion-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  const path = join(directory, "fixture.ts");
  writeFileSync(path, source);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, module: "preserve" },
      include: ["fixture.ts"],
    }),
  );
  const config = join(directory, ".oxlintrc.json");
  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: "off" },
      options: { typeAware: true },
      rules: { "typescript/no-unnecessary-type-assertion": "error" },
    }),
  );
  const before = _typeErrors(path);
  const run = () => {
    return spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--config", config, "--fix", path],
      { cwd: directory, encoding: "utf8" },
    );
  };
  const result = run();
  expect(result.status, result.stdout + result.stderr).toBe(0);
  const fixed = readFileSync(path, "utf8");
  run();
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return { before, after: _typeErrors(path), fixed };
}

it("proves an isolated native primitive assertion fix compatible with TS5.9", () => {
  const result = _nativeAssertionFix(
    "const count: number = 1;\nconst copy = count as number;\n",
  );
  expect(result.fixed).toBe("const count: number = 1;\nconst copy = count;\n");
  expect(result.before).toEqual([]);
  expect(result.after).toEqual([]);
});

it("preserves generic CRUD assertions required by the TS5.9 return contract", () => {
  const source = `function createClient<T>(query: () => Promise<Array<Record<string, unknown>>>) {
  const client: { read: () => Promise<T> } = {
    read: async () => {
      const rows = await query();
      return rows[0] as T;
    },
  };
  return client;
}
`;
  const directory = mkdtempSync(join(tmpdir(), "crud-contract-"));
  directories.push(directory);
  const path = join(directory, "fixture.ts");
  writeFileSync(path, source);
  expect(_typeErrors(path)).toEqual([]);
  writeFileSync(path, source.replace("rows[0] as T", "rows[0]"));
  expect(_typeErrors(path)).toContain(2322);
  expect(_fix({ source: source })).toBe(source);
});

function _runJavascript(source: string): string {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

it.each([
  [
    'const value = { [Symbol.toPrimitive](hint) { return hint; } };\nconsole.log("value=" + value);\n',
    "value=default\n",
  ],
  [
    'const value = { valueOf() { return 7; }, toString() { return "object"; } };\nconsole.log("value=" + value);\n',
    "value=7\n",
  ],
])(
  "preserves runtime coercion for ambiguous concatenation %s",
  (source, output) => {
    expect(_runJavascript(source)).toBe(output);
    const fixed = _fix({ source: source, extension: "js" });
    expect(_runJavascript(fixed)).toBe(output);
    expect(fixed).toBe(source);
  },
);
