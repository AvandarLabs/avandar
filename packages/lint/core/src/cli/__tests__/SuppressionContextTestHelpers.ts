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

/** Inputs consumed by assertSuppressionHandoff. */
type AssertSuppressionHandoffOptions = {
  report: { outcomes: unknown[]; summaries: unknown[] };
  directory: string;
  path: string;
  ruleId: string;
  capability: string;
};

/** Workspace root supplying the real test engines and dependencies. */
export const ROOT: string = resolve(import.meta.dirname, "../../../../../..");

/** Canonical CSS rule identity used by suppression coverage tests. */
export const CSS_RULE: string = "avandar/canonical-block-comments";

/** Native violation used to test suppression-sensitive coverage. */
export const NATIVE: string = 'if (Boolean(1)) console.log("uncovered");';

/** Custom rule violation used to test suppression-sensitive coverage. */
export const CUSTOM: string =
  "const _localE2ECount = 1;\nconsole.log(_localE2ECount);";

/** Multiline CSS prose used to test suppression-sensitive coverage. */
export const PROSE: string = "/* First sentence.\n   Second sentence. */";

const directories: string[] = [];

/** Creates an isolated repository for suppression coverage tests. */
export function createSuppressionRepository(): string {
  const directory = mkdtempSync(join(tmpdir(), "suppression-coverage-"));
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      type: "module",
      scripts: {
        lint: 'oxlint . && stylelint "src/**/*.css"',
        "lint:css": 'stylelint "src/**/*.css"',
      },
    }),
  );
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    JSON.stringify({
      categories: { correctness: "off" },
      plugins: ["typescript"],
      jsPlugins: [
        { name: "avandar", specifier: "@avandar/lint-typescript/oxlint" },
      ],
      rules: {
        curly: "error",
        "avandar/local-e2e-casing": "error",
        "typescript/prefer-as-const": "error",
      },
    }),
  );
  writeFileSync(
    join(directory, "stylelint.config.js"),
    `export default { plugins: ["@avandar/lint-css/stylelint"], rules: { "${CSS_RULE}": true, "color-no-invalid-hex": true } };\n`,
  );
  return directory;
}

/** Collects coverage while verifying the source remains unchanged. */
export async function collectSuppressionCoverage({
  directory,
  path,
  source,
}: Readonly<{
  directory: string;
  path: string;
  source: string;
}>): Promise<CoverageReport> {
  const stdout: string[] = [];
  expect(
    await runCli({
      args: ["coverage", path, "--format", "json", "--no-prompt"],
      io: {
        cwd: directory,
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: () => {},
      },
    }),
  ).toBe(0);
  expect(readFileSync(join(directory, path), "utf8")).toBe(source);
  return JSON.parse(stdout.join(""));
}

/** Checks that a suppressed capability remains a fallback obligation. */
export function assertSuppressionHandoff({
  report,
  directory,
  path,
  ruleId,
  capability,
}: Readonly<AssertSuppressionHandoffOptions>): void {
  expect(report.outcomes).toContainEqual(
    expect.objectContaining({
      path: join(directory, path),
      ruleId,
      capability,
      state: "fallback",
      recovery: expect.stringContaining("suppression"),
    }),
  );
  expect(report.summaries).toContainEqual(
    expect.objectContaining({
      ruleId,
      state: "fallback",
      uncovered: expect.arrayContaining([
        { path: join(directory, path), capability },
      ]),
    }),
  );
}

/** Builds a native violation with the requested suppression context. */
export function buildNativeSourceFromSuppression({
  prefix,
  kind,
}: Readonly<{ prefix: string; kind: string }>): string {
  const blanket = kind.startsWith("blanket");
  const mode = kind.replace("blanket-", "");
  const rules = blanket ? "" : " curly, avandar/local-e2e-casing";
  if (mode === "region") {
    return `export {};\n/* ${prefix}-disable${rules} */\n${NATIVE}\n${CUSTOM}\n/* ${prefix}-enable${rules} */\n`;
  }
  const directive = mode === "line" ? "disable-line" : "disable-next-line";
  const nativeRule = blanket ? "" : " curly";
  const customRule = blanket ? "" : " avandar/local-e2e-casing";
  if (mode === "line") {
    return `export {};\n${NATIVE} // ${prefix}-${directive}${nativeRule}\nconst _localE2ECount = 1; console.log(_localE2ECount); // ${prefix}-${directive}${customRule}\n`;
  }
  return `export {};\n// ${prefix}-${directive}${nativeRule}\n${NATIVE}\n// ${prefix}-${directive}${customRule}\n${CUSTOM}\n`;
}

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});
