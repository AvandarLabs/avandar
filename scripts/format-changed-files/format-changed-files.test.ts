import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import type { SpawnSyncReturns } from "node:child_process";

/**
 * A stand-in for `pnpm` that treats the formatters as no-ops and simulates the
 * linters through markers in each file, so the fix loop can be tested without
 * real rules. Every linter call is appended to `calls.log` next to the stub.
 *
 * - `lint-passes-left: N` needs N more `--fix` runs. Each run lowers it by one,
 *   like a rule whose repair only lands after an earlier repair.
 * - `oscillate: a` flips between `a` and `b` on every `--fix` run, like two
 *   repairs that keep undoing each other.
 * - `unfixable` is an error that no `--fix` run repairs.
 */
const STUB_PNPM = `#!/usr/bin/env bash
shift
tool="$1"
shift
case "$tool" in
  oxfmt|prettier) exit 0 ;;
esac
is_fix=0
files=()
for arg in "$@"; do
  case "$arg" in
    --fix) is_fix=1 ;;
    -*) ;;
    *) files+=("$arg") ;;
  esac
done
mode=check
[ "$is_fix" -eq 1 ] && mode=fix
echo "$tool $mode" >> "$(dirname "$0")/calls.log"
status=0
for f in "\${files[@]}"; do
  if [ "$is_fix" -eq 1 ]; then
    left=$(sed -n 's/.*lint-passes-left: \\([0-9]*\\).*/\\1/p' "$f")
    if [ -n "$left" ] && [ "$left" -gt 0 ]; then
      lowered=$((left - 1))
      sed -i.bak "s/lint-passes-left: $left/lint-passes-left: $lowered/" "$f"
      rm -f "$f.bak"
    fi
    if grep -q 'oscillate: a' "$f"; then
      sed -i.bak 's/oscillate: a/oscillate: b/' "$f"
    else
      sed -i.bak 's/oscillate: b/oscillate: a/' "$f"
    fi
    rm -f "$f.bak"
  fi
  if grep -qE 'lint-passes-left: [1-9]|unfixable|oscillate' "$f"; then
    echo "$f: error $tool(stub): remaining lint error"
    status=1
  fi
done
exit "$status"
`;

/**
 * Returns the parent environment without any `GIT_*` variable and without the
 * user's global or system git config, so git calls stay inside the temporary
 * repository and ignore personal hooks or commit signing.
 */
function _createIsolatedGitEnv(pathPrefix: string): NodeJS.ProcessEnv {
  const inheritedEntries = Object.entries(process.env).filter(([key]) => {
    return !key.startsWith("GIT_");
  });
  return {
    ...Object.fromEntries(inheritedEntries),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    PATH: `${pathPrefix}${process.env.PATH ?? ""}`,
  };
}

function _runGit(directory: string, args: readonly string[]): void {
  const result = spawnSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    env: _createIsolatedGitEnv(""),
  });
  expect(result.status, result.stderr).toBe(0);
}

/**
 * Creates a git repository whose branch adds the given files on top of an
 * `origin/develop` base, plus a `.stub-bin` directory holding the stub `pnpm`.
 * The repository is deleted when the current test finishes.
 */
function _createRepository(files: Readonly<Record<string, string>>): string {
  const directory = mkdtempSync(join(tmpdir(), "format-changed-files-"));
  onTestFinished(() => {
    rmSync(directory, { recursive: true, force: true });
  });
  _runGit(directory, ["init", "--quiet", "--initial-branch", "feature"]);
  _runGit(directory, ["config", "user.email", "test@example.com"]);
  _runGit(directory, ["config", "user.name", "Test"]);
  _runGit(directory, ["commit", "--quiet", "--allow-empty", "-m", "base"]);
  _runGit(directory, ["update-ref", "refs/remotes/origin/develop", "HEAD"]);
  Object.entries(files).forEach(([path, content]) => {
    mkdirSync(join(directory, path, ".."), { recursive: true });
    writeFileSync(join(directory, path), content);
  });
  _runGit(directory, ["add", "--all"]);
  _runGit(directory, ["commit", "--quiet", "-m", "change"]);
  mkdirSync(join(directory, ".stub-bin"));
  writeFileSync(join(directory, ".stub-bin/pnpm"), STUB_PNPM);
  chmodSync(join(directory, ".stub-bin/pnpm"), 0o755);
  return directory;
}

function _runScript(directory: string): SpawnSyncReturns<string> {
  return spawnSync(
    "bash",
    [resolve(import.meta.dirname, "format-changed-files.sh")],
    {
      cwd: directory,
      encoding: "utf8",
      env: _createIsolatedGitEnv(`${join(directory, ".stub-bin")}:`),
    },
  );
}

describe("format-changed-files", () => {
  it("exits 0 after linting changed files that are already clean", () => {
    const repositoryDirectory = _createRepository({ "src/a.ts": "// clean\n" });

    const result = _runScript(repositoryDirectory);

    expect(result.status, result.stderr).toBe(0);
    expect(
      readFileSync(join(repositoryDirectory, ".stub-bin/calls.log"), "utf8"),
    ).toContain("oxlint check");
  });

  it("repeats --fix until a repair that needs two passes is complete", () => {
    const repositoryDirectory = _createRepository({
      "src/a.ts": "// lint-passes-left: 2\n",
    });

    const result = _runScript(repositoryDirectory);

    expect(readFileSync(join(repositoryDirectory, "src/a.ts"), "utf8")).toBe(
      "// lint-passes-left: 0\n",
    );
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toMatch(/modified the following files[^]*src\/a\.ts/);
    expect(result.stderr).not.toContain("Lint errors remain");
  });

  it("exits 1 when a TypeScript lint error remains after fixing", () => {
    const repositoryDirectory = _createRepository({
      "src/a.ts": "// unfixable\n",
    });

    const result = _runScript(repositoryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Lint errors remain");
    expect(result.stderr).toContain("src/a.ts: error oxlint(stub)");
  });

  it("exits 1 when a CSS lint error remains after fixing", () => {
    const repositoryDirectory = _createRepository({
      "src/a.css": "/* unfixable */\n",
    });

    const result = _runScript(repositoryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/a.css: error stylelint(stub)");
  });

  it("exits 1 for a remaining lint error while listing rewritten files", () => {
    const repositoryDirectory = _createRepository({
      "src/a.ts": "// unfixable\n",
      "src/b.ts": "// lint-passes-left: 1\n",
    });

    const result = _runScript(repositoryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/a.ts: error oxlint(stub)");
    expect(result.stderr).toContain("Lint errors remain");
    expect(result.stderr).toMatch(/modified the following files[^]*src\/b\.ts/);
  });

  it("exits 1 when fixes keep changing files after the pass limit", () => {
    const repositoryDirectory = _createRepository({
      "src/a.ts": "// oscillate: a\n",
    });

    const result = _runScript(repositoryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/did not settle within \d+ passes/);
    expect(result.stderr).not.toContain("Lint errors remain");
  });
});
