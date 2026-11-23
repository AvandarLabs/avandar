import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { afterEach, expect } from "vitest";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

/** Inputs consumed by fixComponentSource. */
type FixComponentSourceOptions = {
  source: string;
  extension?: string;
  rules?: string[];
  root?: boolean;
};

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");

const directories: string[] = [];

/** Capability identities exercised by these fixer regression tests. */
export const SAFE = [
  ["AF-12", "single-component-props", "component-props-name"],
  ["AF-13", "local-primitive-bindings", "local-e2e-casing"],
  ["AF-14", "boolean-jsx-children", "jsx-conditional-ternary"],
] as const;

/** Creates an isolated repository for component fixer coverage tests. */
export function createComponentRepository(extension: string = "tsx"): string {
  const directory = mkdtempSync(join(tmpdir(), "component-coverage-"));
  directories.push(directory);
  ["node_modules", "eslint"].forEach((name) => {
    symlinkSync(join(ROOT, name), join(directory, name));
  });
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      scripts: {
        lint: "oxlint --report-unused-disable-directives-severity=error .",
      },
    }),
  );
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    readFileSync(join(ROOT, ".oxlintrc.json")),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "preserve",
        jsx: "react-jsx",
      },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, `src/reviewed.${extension}`), "export {};\n");
  return directory;
}

/** Fixes component source and verifies the second pass is idempotent. */
export function fixComponentSource({
  source,
  extension = "tsx",
  rules = SAFE.map(([, , name]) => {
    return name;
  }),
  root = false,
}: Readonly<FixComponentSourceOptions>): string {
  const directory = createComponentRepository(extension);
  const path = join(directory, `src/reviewed.${extension}`);
  const config = JSON.parse(
    readFileSync(join(directory, ".oxlintrc.json"), "utf8"),
  );
  if (!root) {
    config.rules = Object.fromEntries(
      rules.map((name) => {
        return [`avandar/${name}`, "error"];
      }),
    );
    config.overrides = [];
    config.options = {};
  }
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  writeFileSync(path, source);
  const run = () => {
    return spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--fix", `src/reviewed.${extension}`],
      { cwd: directory, encoding: "utf8" },
    );
  };
  const first = run();
  expect(first.error, `${first.stdout}${first.stderr}`).toBeUndefined();
  expect(first.status, `${first.stdout}${first.stderr}`).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, `${second.stdout}${second.stderr}`).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

/** Evaluates a component fixture to compare observable JSX results. */
export function evaluateComponentSource({
  source,
  context,
}: Readonly<{ source: string; context: Record<string, unknown> }>): unknown {
  const script = ts.transpileModule(source.replace("export ", ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext },
  }).outputText;
  return runInNewContext(`${script}\nCard();`, {
    ...context,
    Observer: "observer",
    Node: "node",
    React: {
      createElement: (type: unknown, _props: unknown, children: unknown) => {
        return type === "observer" ? children : "rendered-node";
      },
    },
  });
}

/** Collects exact component coverage for a fixture repository. */
export async function collectComponentCoverage({
  directory,
  extension = "tsx",
  status = 0,
}: Readonly<{
  directory: string;
  extension?: string;
  status?: number;
}>): Promise<CoverageReport> {
  const stdout: string[] = [];
  const code = await runCli({
    args: [
      "coverage",
      `src/reviewed.${extension}`,
      "--format",
      "json",
      "--no-prompt",
    ],
    io: {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  });
  expect(code).toBe(status);
  return JSON.parse(stdout.join(""));
}

/** Checks component source with the fixture TypeScript compiler. */
export function getComponentTypeDiagnosticsFromSource(source: string): {
  status: number | undefined;
  diagnostics: string;
} {
  const directory = createComponentRepository();
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "preserve",
        target: "ESNext",
        jsx: "react-jsx",
        types: [],
        skipLibCheck: true,
      },
      include: ["src"],
    }),
  );
  const result = spawnSync(
    join(ROOT, "node_modules/.bin/tsc"),
    ["--project", directory, "--pretty", "false"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(result.error).toBeUndefined();
  return {
    status: result.status ?? undefined,
    diagnostics: `${result.stdout}${result.stderr}`,
  };
}

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});
