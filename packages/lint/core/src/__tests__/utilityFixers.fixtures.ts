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
import { runCli } from "../cli/cliHelpers";
import type { collectCoverage } from "../cli/coverageHelpers";

/** Inputs consumed by fixUtilitySource. */
type FixUtilitySourceOptions = {
  source: string;
  extension?: string;
  root?: boolean;
  disabled?: string;
  files?: Readonly<Record<string, string>>;
};

/** Workspace root containing fixer and compiler dependencies. */
export const ROOT: string = resolve(import.meta.dirname, "../../../../..");

const directories: string[] = [];

/** Utility capabilities exercised by the fixer fixtures. */
export const SAFE = [
  ["avlint-ts-012", "literal-property-map", "property-helper-callbacks"],
  ["avlint-ts-012", "literal-property-equality", "property-helper-callbacks"],
  ["avlint-ts-013", "fresh-data-object", "straight-line-object-construction"],
  [
    "avlint-ts-014",
    "optional-parameter-candidates",
    "optional-array-candidates",
  ],
] as const;

/** Minimal utility import establishing the fixture dependency. */
export const IMPORT: string = 'import { identity } from "@avandar/utils";\n';

/** Utility imports required to prove all supported utility capabilities. */
export const PROOF_IMPORT: string =
  'import { identity, prop, propEq, isDefined } from "@avandar/utils";\n';

/** Source examples exercising the supported utility fixer capabilities. */
export const SOURCES: string[] = [
  `${IMPORT}export const result: number[] = [{ id: 1 }].map(function(row) { return row.id; });`,
  `${IMPORT}export const result: { id: number }[] = [{ id: 1 }].filter(function(row) { return row.id === 1; });`,
  "export function build(): { count: number } { const result = { count: 0 }; result.count = 2; return result; }",
  `${PROOF_IMPORT}export function build(first: number | null | undefined, second: number | null | undefined): (number | null)[] { const result: (number | null)[] = []; if (first !== undefined) {\n  result.push(first);\n} if (second !== undefined) {\n  result.push(second);\n} return result; }`,
];

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

/**
 * Creates a temporary utility fixture repository and returns its directory.
 * Use it, for example, to prepare a fixture for coverage collection.
 */
export function createUtilityRepository({
  extension = "ts",
  source = PROOF_IMPORT,
  files = {},
}: Readonly<{
  extension?: string;
  source?: string;
  files?: Readonly<Record<string, string>>;
}> = {}): string {
  const directory = mkdtempSync(join(tmpdir(), "utility-coverage-"));
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
        moduleResolution: "bundler",
        target: "ESNext",
        types: [],
        skipLibCheck: true,
        allowImportingTsExtensions: true,
        paths: { "@utils/*": [join(ROOT, "packages/shared/utils/src/*")] },
      },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, `src/reviewed.${extension}`), source);
  Object.entries(files).forEach(([name, content]) => {
    writeFileSync(join(directory, "src", name), content);
  });
  return directory;
}

/**
 * Repairs utility source and returns the fixed text and fixture directory.
 * Use it, for example, to check that a utility fix is idempotent.
 */
export function fixUtilitySource({
  source,
  extension = "ts",
  root = false,
  disabled,
  files = {},
}: Readonly<FixUtilitySourceOptions>): { fixed: string; directory: string } {
  const directory = createUtilityRepository({
    extension: extension,
    source: source,
    files: files,
  });
  const config = JSON.parse(
    readFileSync(join(directory, ".oxlintrc.json"), "utf8"),
  );
  if (!root) {
    config.rules = Object.fromEntries(
      SAFE.map(([, , name]) => {
        return [`avandar/${name}`, "error"];
      }),
    );
    config.overrides = [];
    config.options = {};
  }
  if (disabled) {
    config.rules[`avandar/${disabled}`] = "off";
  }
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  const path = join(directory, `src/reviewed.${extension}`);
  const run = () => {
    return spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--fix", `src/reviewed.${extension}`],
      { cwd: directory, encoding: "utf8" },
    );
  };
  // A collection fix removes its declaration, so an overlapping native fix on
  // that declaration is dropped and still reported once. The next pass is
  // clean because the declaration no longer exists.
  const initial = run();
  expect(initial.error, `${initial.stdout}${initial.stderr}`).toBeUndefined();
  const first = initial.status === 0 ? initial : run();
  expect(
    first.status,
    `${first.stdout}${first.stderr}${readFileSync(path, "utf8")}`,
  ).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, `${second.stdout}${second.stderr}`).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return { fixed, directory };
}

/**
 * Returns the compiler status and diagnostics for utility source.
 * Use it, for example, to check repaired code against public helper types.
 */
export function getUtilityTypeDiagnosticsFromSource({
  source,
  files = {},
}: Readonly<{ source: string; files?: Readonly<Record<string, string>> }>): {
  status: number | undefined;
  diagnostics: string;
} {
  const directory = createUtilityRepository({
    extension: "ts",
    source: source,
    files: files,
  });
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

/**
 * Returns CLI coverage data for a utility fixture repository.
 * Use it, for example, to inspect the coverage handoff for a repaired file.
 */
export async function collectUtilityCoverage({
  directory,
  extension = "ts",
  status = 0,
}: Readonly<{
  directory: string;
  extension?: string;
  status?: number;
}>): Promise<Awaited<ReturnType<typeof collectCoverage>>> {
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

function _loadUtility(name: string): Record<string, unknown> {
  const path = join(ROOT, `packages/shared/utils/src/${name}`);
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
    },
  }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports,
    require: (specifier: string) => {
      return _loadUtility(specifier.replace("@utils/", ""));
    },
  });
  return exports;
}

/**
 * Evaluates utility source and returns its exported functions.
 * Use it, for example, to check repaired callbacks with utility
 * implementations.
 */
export function evaluateUtilitySource({
  source,
  extra = {},
}: Readonly<{ source: string; extra?: Record<string, unknown> }>): Record<
  string,
  (...args: unknown[]) => unknown
> {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
    },
  }).outputText;
  const exports = {};
  const helpers = {
    prop: _loadUtility("objects/hofs/prop/prop.ts").prop,
    propEq: _loadUtility("objects/hofs/propEq/propEq.ts").propEq,
    isDefined: _loadUtility("guards/isDefined/isDefined.ts").isDefined,
  };
  runInNewContext(output, {
    exports,
    require: () => {
      return helpers;
    },
    ...extra,
  });
  return exports;
}
