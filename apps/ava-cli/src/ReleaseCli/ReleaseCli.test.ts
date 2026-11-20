import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import { noop } from "@avandar/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Run a Git command in the given directory and return trimmed stdout. */
function _git(
  options: Readonly<{ cwd: string; args: readonly string[] }>,
): string {
  return execFileSync("git", [...options.args], {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function _commitPackage(
  options: Readonly<{ repoRoot: string; contents: string }>,
): void {
  writeFileSync(join(options.repoRoot, "package.json"), options.contents);
  _git({ cwd: options.repoRoot, args: ["add", "."] });
  _git({
    cwd: options.repoRoot,
    args: [
      "-c",
      "user.name=Ava CLI Test",
      "-c",
      "user.email=ava-cli@example.test",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "commit.gpgSign=false",
      "commit",
      "-m",
      "Set fixture version",
    ],
  });
}

function _createRepos(directory: string): { origin: string; repoRoot: string } {
  const origin = join(directory, "origin");
  const repoRoot = join(directory, "checkout");
  mkdirSync(join(origin, "apps/ava-cli"), { recursive: true });
  writeFileSync(join(origin, "pnpm-workspace.yaml"), "packages: []\n");
  writeFileSync(join(origin, "apps/ava-cli/package.json"), "{}\n");
  _git({ cwd: origin, args: ["init", "--initial-branch=main"] });
  _commitPackage({ repoRoot: origin, contents: '{"version":"0.12.0"}\n' });
  _git({ cwd: directory, args: ["clone", origin, repoRoot] });
  _git({ cwd: repoRoot, args: ["switch", "-c", "feat/local-work"] });
  _commitPackage({ repoRoot: origin, contents: '{"version":"0.13.2"}\n' });
  return { origin, repoRoot };
}

describe("ava release get-prod-version", () => {
  let directory: string;
  let origin: string;
  let repoRoot: string;
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "ava-prod-version-"));
    ({ origin, repoRoot } = _createRepos(directory));
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.argv = [process.execPath, "ava", "release", "get-prod-version"];
    process.exitCode = undefined;
    vi.spyOn(process, "cwd").mockReturnValue(join(repoRoot, "apps/ava-cli"));
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  it("prints only the latest origin/main version from a dirty feature checkout", async () => {
    const LOCAL_PACKAGE = '{"version":"99.0.0-dev"}\n';
    writeFileSync(join(repoRoot, "package.json"), LOCAL_PACKAGE);
    // A narrowed fetch configuration must not leave the main lookup stale.
    _git({
      cwd: repoRoot,
      args: ["remote", "set-branches", "origin", "develop"],
    });

    await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

    expect(console.log).toHaveBeenCalledExactlyOnceWith("0.13.2");
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
    expect(_git({ cwd: repoRoot, args: ["branch", "--show-current"] })).toBe(
      "feat/local-work",
    );
    expect(readFileSync(join(repoRoot, "package.json"), "utf8")).toBe(
      LOCAL_PACKAGE,
    );
    expect(_git({ cwd: repoRoot, args: ["show", "main:package.json"] })).toBe(
      '{"version":"0.12.0"}',
    );
  });

  it("fails on stderr instead of printing a cached version when origin is unavailable", async () => {
    _git({
      cwd: repoRoot,
      args: ["remote", "set-url", "origin", join(directory, "missing")],
    });

    await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Could not fetch"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails instead of printing a cached version when main no longer exists on origin", async () => {
    _git({ cwd: origin, args: ["branch", "-m", "archived"] });

    await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Could not fetch"),
    );
    expect(process.exitCode).toBe(1);
  });

  it.each([
    "invalid JSON",
    "{}",
    '{"version":42}',
    '{"version":""}',
    '{"version":"  "}',
  ])(
    "fails on stderr when main has no usable package version: %s",
    async (contents) => {
      _commitPackage({ repoRoot: origin, contents });

      await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("version"),
      );
      expect(process.exitCode).toBe(1);
    },
  );

  it("explains the repository requirement on stderr when invoked outside Avandar", async () => {
    vi.mocked(process.cwd).mockReturnValue(directory);

    await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("repository"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("prints help without needing a repository", async () => {
    vi.mocked(process.cwd).mockReturnValue(directory);
    process.argv.push("--help");

    await ReleaseCli.getCommandCLI("get-prod-version").state.action?.({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("ava release get-prod-version"),
    );
    expect(console.error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });
});

/** Everything `ava release` printed, one `console.log` call per line. */
function _stdoutText(): string {
  return vi
    .mocked(console.log)
    .mock.calls.map((call) => {
      return call.map(String).join(" ");
    })
    .join("\n");
}

/**
 * Run `ava release` with both versions passed, so nothing would prompt if a
 * refusal regressed.
 */
async function _runRelease(
  options: Readonly<{ dryRun: boolean }>,
): Promise<void> {
  await ReleaseCli.state.action?.({
    version: "0.15.0",
    next: "0.15.1",
    yes: false,
    dryRun: options.dryRun,
    skipCiCheck: false,
    skipChangelog: false,
  });
}

describe("ava release on a branch that is not a source branch", () => {
  let directory: string;
  let repoRoot: string;
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;

  /** Every ref in a repository with its SHA, to prove nothing moved. */
  function _listRefs(cwd: string): string {
    return _git({
      cwd,
      args: ["for-each-ref", "--format=%(refname) %(objectname)"],
    });
  }

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "ava-release-refusal-"));
    ({ repoRoot } = _createRepos(directory));
    _git({ cwd: repoRoot, args: ["switch", "main"] });
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.argv = [process.execPath, "ava", "release"];
    process.exitCode = undefined;
    vi.spyOn(process, "cwd").mockReturnValue(join(repoRoot, "apps/ava-cli"));
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  it("refuses main with exit code 1, naming both source branches", async () => {
    await _runRelease({ dryRun: false });

    expect(process.exitCode).toBe(1);
    expect(_stdoutText()).toContain('"alpha-dev" or "develop"');
    expect(_stdoutText()).toContain('(currently on "main")');
  });

  it("refuses main before fetching, committing, or pushing anything", async () => {
    const origin = join(directory, "origin");
    const refsBefore = _listRefs(repoRoot);
    const originRefsBefore = _listRefs(origin);

    await _runRelease({ dryRun: false });

    // A fetch would move origin/main to origin's newer commit.
    expect(_listRefs(repoRoot)).toBe(refsBefore);
    expect(_listRefs(origin)).toBe(originRefsBefore);
    expect(_git({ cwd: repoRoot, args: ["status", "--short"] })).toBe("");
    // Every mutating command is echoed as `$ <command>` before it runs.
    expect(_stdoutText()).not.toContain("$ ");
  });

  it("prints no release banner on a refused branch", async () => {
    await _runRelease({ dryRun: false });

    expect(_stdoutText()).not.toContain("MAINLINE release");
    expect(_stdoutText()).not.toContain("ALPHA release");
  });

  it("names the branch, not heads/main, when a tag is also named main", async () => {
    _git({ cwd: repoRoot, args: ["tag", "main"] });

    await _runRelease({ dryRun: false });

    expect(_stdoutText()).toContain('(currently on "main")');
  });

  it("refuses a detached HEAD, naming it", async () => {
    _git({ cwd: repoRoot, args: ["switch", "--detach"] });

    await _runRelease({ dryRun: false });

    expect(process.exitCode).toBe(1);
    expect(_stdoutText()).toContain('(currently on "a detached HEAD")');
  });
});

describe("ava release on a source branch", () => {
  let directory: string;
  let repoRoot: string;
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "ava-release-banner-"));
    ({ repoRoot } = _createRepos(directory));
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.argv = [process.execPath, "ava", "release", "--dry-run"];
    process.exitCode = undefined;
    vi.spyOn(process, "cwd").mockReturnValue(join(repoRoot, "apps/ava-cli"));
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  it.each([
    [
      "alpha-dev",
      ": alpha-dev to alpha. Deploys PRODUCTION (app.avandarlabs.com).",
    ],
    [
      "develop",
      ": develop to main. Deploys the mainline test URL, not production.",
    ],
  ])(
    "prints the %s banner before preflight runs",
    async (branch, bannerText) => {
      _git({ cwd: repoRoot, args: ["switch", "-c", branch] });
      // A tracked change makes preflight refuse locally, before any fetch.
      writeFileSync(join(repoRoot, "package.json"), '{"version":"dirty"}\n');

      await _runRelease({ dryRun: true });

      const stdout = _stdoutText();
      expect(stdout).toContain(bannerText);
      expect(stdout.indexOf(bannerText)).toBeLessThan(
        stdout.indexOf("Preflight"),
      );
      expect(stdout).toContain("The working tree has tracked changes");
      expect(process.exitCode).toBe(1);
    },
  );
});
