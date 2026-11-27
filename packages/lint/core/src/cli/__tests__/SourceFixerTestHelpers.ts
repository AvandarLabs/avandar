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
import { afterEach, expect } from "vitest";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

/** Inputs consumed by fixSource. */
type FixSourceOptions = {
  source: string;
  extension?: string;
  rules?: string[];
  root?: boolean;
};

const ROOT: string = resolve(import.meta.dirname, "../../../../../..");

const directories: string[] = [];

/** Capability identities exercised by these fixer regression tests. */
export const SAFE = [
  [
    "avlint-ts-006",
    "direct-top-level-calls",
    "top-level-function-declarations",
  ],
  ["avlint-ts-007", "direct-nested-calls", "nested-arrow-functions"],
  ["avlint-ts-008", "private-direct-calls", "private-helper-prefix"],
] as const;

/** Creates a repository for source declaration fixer tests. */
export function createSourceRepository(extension: string = "ts"): string {
  const directory = mkdtempSync(join(tmpdir(), "source-coverage-"));
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
      compilerOptions: { strict: true, noEmit: true, module: "preserve" },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, `src/reviewed.${extension}`), "export {};\n");
  return directory;
}

/** Collects source capability outcomes for a fixture repository. */
export async function collectSourceCoverage({
  directory,
  extension = "ts",
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

/** Fixes source declarations and verifies an idempotent second pass. */
export function fixSource({
  source,
  extension = "ts",
  rules = SAFE.map(([, , name]) => {
    return name;
  }),
  root = false,
}: Readonly<FixSourceOptions>): string {
  const directory = createSourceRepository(extension);
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
  expect(first.error, first.stdout + first.stderr).toBeUndefined();
  expect(first.status, `${first.stdout}${first.stderr}`).toBe(0);
  const fixed = readFileSync(path, "utf8");
  const second = run();
  expect(second.status, second.stdout + second.stderr).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(fixed);
  return fixed;
}

/** Checks source declarations with the fixture TypeScript compiler. */
export function getSourceTypeDiagnosticsFromSource(source: string): {
  status: number | undefined;
  diagnostics: string;
} {
  const directory = createSourceRepository();
  writeFileSync(join(directory, "src/reviewed.ts"), source);
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "preserve",
        target: "ESNext",
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
