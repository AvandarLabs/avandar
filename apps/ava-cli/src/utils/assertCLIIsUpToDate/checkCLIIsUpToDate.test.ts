import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCLIIsUpToDate } from "@ava-cli/utils/assertCLIIsUpToDate/checkCLIIsUpToDate";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Builds a throwaway repo that looks enough like the monorepo for the check:
 * `apps/ava-cli` with a package.json, a source file, and optionally a bundle.
 */
function createFakeRepo(options: {
  sourceVersion: string;
  withBundle: boolean;
}): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "ava-cli-check-"));
  const cliDir = join(repoRoot, "apps/ava-cli");

  mkdirSync(join(cliDir, "src"), { recursive: true });
  writeFileSync(join(repoRoot, "pnpm-workspace.yaml"), "packages:\n");
  writeFileSync(
    join(cliDir, "package.json"),
    JSON.stringify({
      name: "@avandar/ava-cli",
      version: options.sourceVersion,
    }),
  );
  writeFileSync(join(cliDir, "src/main.ts"), "export {}\n");

  if (options.withBundle) {
    mkdirSync(join(cliDir, "dist"), { recursive: true });
    writeFileSync(join(cliDir, "dist/main.cjs"), "// built\n");
  }
  return repoRoot;
}

/** Backdates a file so mtime comparisons are deterministic. */
function backdate(path: string, secondsAgo: number): void {
  const when = new Date(Date.now() - secondsAgo * 1000);
  utimesSync(path, when, when);
}

const createdRepos: string[] = [];

function createRepo(options: {
  sourceVersion: string;
  withBundle: boolean;
}): string {
  const repoRoot = createFakeRepo(options);
  createdRepos.push(repoRoot);
  return repoRoot;
}

afterEach(() => {
  createdRepos.length = 0;
});

describe("checkCLIIsUpToDate", () => {
  it("is up to date outside the monorepo, where there is nothing to compare", () => {
    const result = checkCLIIsUpToDate({
      repoRoot: undefined,
      builtVersion: "0.0.0",
      bundlePath: undefined,
    });

    expect(result).toEqual({ upToDate: true });
  });

  it("reports a version mismatch between the running bundle and the source", () => {
    const repoRoot = createRepo({ sourceVersion: "0.2.0", withBundle: true });

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.1.0",
      bundlePath: join(repoRoot, "apps/ava-cli/dist/main.cjs"),
    });

    expect(result.upToDate).toBe(false);
    expect(result.upToDate === false && result.reason).toContain("0.1.0");
    expect(result.upToDate === false && result.reason).toContain("0.2.0");
  });

  it("reports a missing bundle", () => {
    const repoRoot = createRepo({ sourceVersion: "0.0.0", withBundle: false });

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.0.0",
      bundlePath: undefined,
    });

    expect(result.upToDate).toBe(false);
    expect(result.upToDate === false && result.reason).toContain("missing");
  });

  it("reports source changes newer than the bundle", () => {
    const repoRoot = createRepo({ sourceVersion: "0.0.0", withBundle: true });
    backdate(join(repoRoot, "apps/ava-cli/dist/main.cjs"), 120);

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.0.0",
      bundlePath: join(repoRoot, "apps/ava-cli/dist/main.cjs"),
    });

    expect(result.upToDate).toBe(false);
    expect(result.upToDate === false && result.reason).toContain("newer");
  });

  it("is up to date when the bundle is newer than every source file", () => {
    const repoRoot = createRepo({ sourceVersion: "0.0.0", withBundle: true });
    const cliDir = join(repoRoot, "apps/ava-cli");
    backdate(join(cliDir, "src/main.ts"), 300);
    backdate(join(cliDir, "package.json"), 300);

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.0.0",
      bundlePath: join(cliDir, "dist/main.cjs"),
    });

    expect(result).toEqual({ upToDate: true });
  });

  it("skips the mtime comparison for a bundle built from another checkout", () => {
    const repoRoot = createRepo({ sourceVersion: "0.0.0", withBundle: true });
    const otherRepoRoot = createRepo({
      sourceVersion: "0.0.0",
      withBundle: true,
    });
    // The other checkout's bundle is old, but comparing mtimes across checkouts
    // says nothing about whether the code differs.
    backdate(join(otherRepoRoot, "apps/ava-cli/dist/main.cjs"), 600);

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.0.0",
      bundlePath: join(otherRepoRoot, "apps/ava-cli/dist/main.cjs"),
    });

    expect(result).toEqual({ upToDate: true });
  });

  it("still reports a version mismatch for a bundle from another checkout", () => {
    const repoRoot = createRepo({ sourceVersion: "0.3.0", withBundle: true });
    const otherRepoRoot = createRepo({
      sourceVersion: "0.1.0",
      withBundle: true,
    });

    const result = checkCLIIsUpToDate({
      repoRoot,
      builtVersion: "0.1.0",
      bundlePath: join(otherRepoRoot, "apps/ava-cli/dist/main.cjs"),
    });

    expect(result.upToDate).toBe(false);
  });
});
