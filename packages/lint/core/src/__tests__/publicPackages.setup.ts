import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TestProject } from "vitest/node";

const ROOT: string = resolve(import.meta.dirname, "../../../../..");

function _run({
  command,
  args,
  cwd,
}: Readonly<{ command: string; args: string[]; cwd: string }>): void {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stdout}${result.stderr}`,
    );
  }
}

function _packPackage({
  directory,
  name,
}: Readonly<{ directory: string; name: string }>): void {
  const original = join(ROOT, "packages/lint", name);
  const target = join(directory, "packages/lint", name);
  mkdirSync(target, { recursive: true });
  ["src", "package.json", "tsup.config.ts", "tsconfig.build.json"].forEach(
    (entry) => {
      cpSync(join(original, entry), join(target, entry), { recursive: true });
    },
  );
  symlinkSync(join(original, "node_modules"), join(target, "node_modules"));
  _run({ command: "pnpm", args: ["build"], cwd: target });
  const packed = join(directory, "packed", name);
  mkdirSync(packed, { recursive: true });
  _run({
    command: "pnpm",
    args: ["pack", "--pack-destination", packed],
    cwd: target,
  });
  const archive = readdirSync(packed).find((entry) => {
    return entry.endsWith(".tgz");
  });
  if (!archive) {
    throw new Error(`No archive produced for ${name}`);
  }
  _run({
    command: "tar",
    args: ["-xzf", join(packed, archive), "-C", packed],
    cwd: directory,
  });
  rmSync(join(packed, archive));
}

/** Builds fresh packed consumers before core tests can read their artifacts. */
export function setup(project: TestProject): () => void {
  const directory = mkdtempSync(join(tmpdir(), "lint-public-packages-"));
  try {
    mkdirSync(join(directory, "packages/lint"), { recursive: true });
    copyFileSync(
      join(ROOT, "tsconfig.base.json"),
      join(directory, "tsconfig.base.json"),
    );
    copyFileSync(
      join(ROOT, "pnpm-workspace.yaml"),
      join(directory, "pnpm-workspace.yaml"),
    );
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({ private: true, type: "module" }),
    );
    symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
    ["rules.yaml", "rules.schema.json"].forEach((name) => {
      copyFileSync(
        join(ROOT, "packages/lint", name),
        join(directory, "packages/lint", name),
      );
    });
    ["core", "typescript", "css"].forEach((name) => {
      _packPackage({ directory: directory, name: name });
    });
    project.provide("publicPackages", join(directory, "packed"));
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return () => {
    rmSync(directory, { recursive: true, force: true });
  };
}
