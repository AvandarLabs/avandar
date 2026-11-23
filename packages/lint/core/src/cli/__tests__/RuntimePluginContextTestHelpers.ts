import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect } from "vitest";
import { runCli } from "../cliHelpers";
import type { CoverageReport } from "../coverageHelpers";

/** Workspace root supplying the real test engines and dependencies. */
export const ROOT: string = resolve(import.meta.dirname, "../../../../../..");

/** Source fixture retained byte-for-byte during plugin context probes. */
export const ORIGINAL: string =
  "export {};\nconst _originalE2ECount = 1;\nconsume(_originalE2ECount);\n";

/** Temporary fixture repositories cleaned up after each test. */
export const directories: string[] = [];

/** Creates a consumer with configurable runtime plugin registrations. */
export function createRuntimePluginRepository(parent: string = tmpdir()): {
  directory: string;
  config: {
    categories: { correctness: string };
    jsPlugins: Array<{ name: string; specifier: string }>;
    rules: { curly: string; "avandar/local-e2e-casing": string };
  };
} {
  const directory = realpathSync(
    mkdtempSync(join(parent, "runtime-plugin-context-")),
  );
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ type: "module", scripts: { lint: "oxlint ." } }),
  );
  writeFileSync(join(directory, "src/reviewed.ts"), ORIGINAL);
  const config = {
    categories: { correctness: "off" },
    jsPlugins: [
      { name: "avandar", specifier: "@avandar/lint-typescript/oxlint" },
    ],
    rules: { curly: "error", "avandar/local-e2e-casing": "error" },
  };
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  return { directory, config };
}

/** Returns runtime context coverage and the CLI exit status. */
export async function collectRuntimePluginCoverage({
  directory,
  expectedSource = ORIGINAL,
}: Readonly<{ directory: string; expectedSource?: string }>): Promise<
  CoverageReport & { status: number }
> {
  const output: string[] = [];
  const status = await runCli({
    args: ["coverage", "src/reviewed.ts", "--format", "json", "--no-prompt"],
    io: {
      cwd: directory,
      stdout: (value) => {
        output.push(value);
      },
      stderr: () => {},
    },
  });
  expect(readFileSync(join(directory, "src/reviewed.ts"), "utf8")).toBe(
    expectedSource,
  );
  return { status, ...JSON.parse(output.join("")) };
}

afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});
