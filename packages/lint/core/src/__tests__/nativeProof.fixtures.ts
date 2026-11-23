import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect } from "vitest";
import { runCli } from "../cli/cliHelpers";
import type { collectCoverage } from "../cli/coverageHelpers";

/** Workspace root containing the native engine and plugin dependencies. */
export const ROOT: string = resolve(import.meta.dirname, "../../../../..");
/** Temporary repositories removed after each test. */
export const directories: string[] = [];
/**
 * Source fixture containing utility imports and multibyte text for native
 * probes.
 */
export const ORIGINAL: string =
  'import { identity, prop, propEq, isDefined } from "@avandar/utils";\nexport {};\nconst unicode = "😀 é";\nconsume(unicode);\n';
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _writeNativeWrapper({
  directory,
  transform,
}: Readonly<{ directory: string; transform: string }>): void {
  const wrapper = `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { appendFileSync, readFileSync } = require("node:fs");
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, \`\${JSON.stringify({ event: "start", args: process.argv.slice(2), cwd: process.cwd() })}\\n\`);
const result = spawnSync(${JSON.stringify(join(ROOT, "node_modules/.bin/oxlint"))}, process.argv.slice(2), { encoding: "utf8" });
let stdout = result.stdout;
let status = result.status;
if (process.argv.includes("json")) {
  const output = JSON.parse(stdout);
  ${transform.replace("ORIGINAL_PATH", JSON.stringify(join(directory, "src/reviewed.tsx")))}
  stdout = JSON.stringify(output);
}
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, \`\${JSON.stringify({ event: "end", args: process.argv.slice(2), cwd: process.cwd() })}\\n\`);
process.stdout.write(stdout);
process.stderr.write(result.stderr);
process.exit(status ?? 1);
`;
  writeFileSync(join(directory, "node_modules/.bin/oxlint"), wrapper, {
    mode: 0o755,
  });
}

/**
 * Creates a fixture repository with a traceable native wrapper and returns its
 * directory.
 * Use it, for example, to set up an isolated coverage integration test.
 */
export function createNativeRepository(transform: string = ""): string {
  const directory = mkdtempSync(join(tmpdir(), "exact-native-coverage-"));
  directories.push(directory);
  mkdirSync(join(directory, "node_modules/.bin"), { recursive: true });
  readdirSync(join(ROOT, "node_modules"))
    .filter((entry) => {
      return entry !== ".bin";
    })
    .forEach((entry) => {
      symlinkSync(
        join(ROOT, "node_modules", entry),
        join(directory, "node_modules", entry),
      );
    });
  symlinkSync(join(ROOT, "eslint"), join(directory, "eslint"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ type: "module", scripts: { lint: "oxlint ." } }),
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
      },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, "src/reviewed.tsx"), ORIGINAL);
  _writeNativeWrapper({ directory, transform });
  return directory;
}

/**
 * Collects coverage evidence, exit status, and child events for a fixture
 * repository.
 * Use it, for example, to inspect a native coverage integration test run.
 */
export async function collectNativeCoverage({
  directory,
  paths = ["src/reviewed.tsx"],
}: Readonly<{ directory: string; paths?: readonly string[] }>): Promise<
  Awaited<ReturnType<typeof collectCoverage>> & {
    status: number;
    children: Array<{ event: string; args: string[]; cwd: string }>;
  }
> {
  const stdout: string[] = [];
  const status = await runCli({
    args: ["coverage", ...paths, "--format", "json", "--no-prompt"],
    io: {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  });
  const result = JSON.parse(stdout.join(""));
  const children = readFileSync(join(directory, "children.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      return JSON.parse(line);
    });
  children
    .filter((entry) => {
      return entry.args.includes("json");
    })
    .forEach((entry) => {
      expect(() => {
        return readdirSync(entry.cwd);
      }).toThrow();
    });
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    ORIGINAL,
  );
  return { ...result, status, children };
}
