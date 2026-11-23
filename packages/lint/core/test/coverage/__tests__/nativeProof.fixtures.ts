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
import { runCli } from "../../../src/cli/main";
import type { collectCoverage } from "../../../src/cli/coverage";

export const ROOT = resolve(import.meta.dirname, "../../../../../..");
export const directories: string[] = [];
export const ORIGINAL =
  'import { identity, prop, propEq, isDefined } from "@avandar/utils";\nexport {};\nconst unicode = "😀 é";\nconsume(unicode);\n';
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

/** Creates a fixture-owned repository and traceable native wrapper. */
export function createNativeRepository(transform = ""): string {
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
  const wrapper = `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { appendFileSync, readFileSync } = require("node:fs");
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, JSON.stringify({ event: "start", args: process.argv.slice(2), cwd: process.cwd() }) + "\\n");
const result = spawnSync(${JSON.stringify(join(ROOT, "node_modules/.bin/oxlint"))}, process.argv.slice(2), { encoding: "utf8" });
let stdout = result.stdout;
let status = result.status;
if (process.argv.includes("json")) {
  const output = JSON.parse(stdout);
  ${transform.replace("ORIGINAL_PATH", JSON.stringify(join(directory, "src/reviewed.tsx")))}
  stdout = JSON.stringify(output);
}
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, JSON.stringify({ event: "end", args: process.argv.slice(2), cwd: process.cwd() }) + "\\n");
process.stdout.write(stdout);
process.stderr.write(result.stderr);
process.exit(status ?? 1);
`;
  writeFileSync(join(directory, "node_modules/.bin/oxlint"), wrapper, {
    mode: 0o755,
  });
  return directory;
}

/** Collects CLI evidence and checks only the fixture-owned mirror paths. */
export async function collectNativeCoverage(
  directory: string,
  paths = ["src/reviewed.tsx"],
): Promise<
  Awaited<ReturnType<typeof collectCoverage>> & {
    status: number;
    children: Array<{ event: string; args: string[]; cwd: string }>;
  }
> {
  const stdout: string[] = [];
  const status = await runCli(
    ["coverage", ...paths, "--format", "json", "--no-prompt"],
    {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  );
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
