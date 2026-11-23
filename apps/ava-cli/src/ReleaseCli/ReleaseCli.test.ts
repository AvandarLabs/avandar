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
import { checkSourceBranchCi } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import { runRelease } from "@ava-cli/ReleaseCli/runRelease/runRelease";
import { noop } from "@avandar/utils";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";

// The real check asks GitHub, which these fixture repositories are not on.
// Every test that reaches it sets the verdict it needs.
vi.mock("@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi");
// A prompt would wait on stdin. Every test that reaches one says so.
vi.mock("@ava-cli/ReleaseCli/releasePromptHelpers");

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

/** Every ref in a repository with its SHA, to prove nothing moved. */
function _listRefs(cwd: string): string {
  return _git({
    cwd,
    args: ["for-each-ref", "--format=%(refname) %(objectname)"],
  });
}

describe("ava release on a branch that is not a source branch", () => {
  let directory: string;
  let repoRoot: string;
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;

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

/**
 * Give a test repository its own identity and turn off signing and hooks, so
 * commits and tags work on any machine without touching global config.
 */
function _configureRepo(repoRoot: string): void {
  const settings: Array<[string, string]> = [
    ["user.name", "Ava CLI Test"],
    ["user.email", "ava-cli@example.test"],
    ["commit.gpgSign", "false"],
    ["tag.gpgSign", "false"],
    ["core.hooksPath", "/dev/null"],
  ];
  settings.forEach(([key, value]) => {
    _git({ cwd: repoRoot, args: ["config", key, value] });
  });
}

/** Commit every change in `repoRoot`, with `package.json` set to `version`. */
function _commitVersion(
  options: Readonly<{ repoRoot: string; version: string; message: string }>,
): void {
  const { repoRoot, version, message } = options;
  writeFileSync(
    join(repoRoot, "package.json"),
    `${JSON.stringify({ name: "fixture", version }, null, 2)}\n`,
  );
  _git({ cwd: repoRoot, args: ["add", "."] });
  _git({ cwd: repoRoot, args: ["commit", "-m", message] });
}

/**
 * Tags named like every release branch, all on `main` before the release, so
 * a bare branch name in any push or lookup would hit the wrong commit.
 */
const BRANCH_NAMED_TAGS = ["main", "alpha", "alpha-dev", "develop"];

/**
 * Isolate the real releases from the machine they run on: no global or system
 * git config, and npm (which `pnpm version` runs) writes its logs under
 * `directory` and skips its registry update check. Undone by
 * `vi.unstubAllEnvs`.
 */
function _isolateFromUserConfig(directory: string): void {
  vi.stubEnv("GIT_CONFIG_GLOBAL", "/dev/null");
  vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
  vi.stubEnv("npm_config_update_notifier", "false");
  vi.stubEnv("npm_config_logs_dir", join(directory, "npm-logs"));
}

/**
 * Push the three line branches from `seed` to origin: `develop` at
 * `0.14.2-dev` and `alpha-dev` at `0.15.0-alpha-dev`, each one commit past
 * `main`, and `alpha` at `main`, along with every `BRANCH_NAMED_TAGS` tag.
 */
function _pushLineBranches(seed: string): void {
  _git({ cwd: seed, args: ["switch", "-c", "develop"] });
  writeFileSync(join(seed, "develop.txt"), "develop work\n");
  _commitVersion({
    repoRoot: seed,
    version: "0.14.2-dev",
    message: "Develop work",
  });
  _git({ cwd: seed, args: ["switch", "-c", "alpha-dev", "main"] });
  writeFileSync(join(seed, "alpha.txt"), "alpha work\n");
  _commitVersion({
    repoRoot: seed,
    version: "0.15.0-alpha-dev",
    message: "Alpha work",
  });
  BRANCH_NAMED_TAGS.forEach((tag) => {
    _git({ cwd: seed, args: ["tag", tag, "main"] });
  });
  _git({
    cwd: seed,
    args: [
      "push",
      "origin",
      "refs/heads/develop:refs/heads/develop",
      "refs/heads/alpha-dev:refs/heads/alpha-dev",
      "refs/heads/main:refs/heads/alpha",
      ...BRANCH_NAMED_TAGS.map((tag) => {
        return `refs/tags/${tag}`;
      }),
    ],
  });
}

/**
 * A bare origin holding both release lines, and a configured clone of it to
 * release from. The origin is bare so a release can push to any branch.
 */
function _createReleaseRepos(directory: string): {
  origin: string;
  checkout: string;
} {
  const origin = join(directory, "origin.git");
  const seed = join(directory, "seed");
  const checkout = join(directory, "checkout");
  _git({
    cwd: directory,
    args: ["init", "--bare", "--initial-branch=main", origin],
  });
  mkdirSync(join(seed, "apps/ava-cli"), { recursive: true });
  _git({ cwd: directory, args: ["init", "--initial-branch=main", seed] });
  _configureRepo(seed);
  writeFileSync(join(seed, "pnpm-workspace.yaml"), "packages: []\n");
  writeFileSync(join(seed, "apps/ava-cli/package.json"), "{}\n");
  _commitVersion({ repoRoot: seed, version: "0.14.1", message: "Initial" });
  _git({ cwd: seed, args: ["remote", "add", "origin", origin] });
  _git({
    cwd: seed,
    args: ["push", "origin", "refs/heads/main:refs/heads/main"],
  });
  _pushLineBranches(seed);
  _git({ cwd: directory, args: ["clone", origin, checkout] });
  _configureRepo(checkout);
  return { origin, checkout };
}

/** Every branch tip in `repoRoot`, keyed by branch name. */
function _readBranchTips(repoRoot: string): Record<string, string> {
  const output = _git({
    cwd: repoRoot,
    args: [
      "for-each-ref",
      "--format=%(refname:lstrip=2) %(objectname)",
      "refs/heads",
    ],
  });
  return Object.fromEntries(
    output.split("\n").map((row) => {
      return row.split(" ");
    }),
  );
}

/** The `version` in package.json at `revision`. */
function _readPackageVersion(
  options: Readonly<{ repoRoot: string; revision: string }>,
): string {
  const contents = _git({
    cwd: options.repoRoot,
    args: ["show", `${options.revision}:package.json`],
  });
  return (JSON.parse(contents) as { version: string }).version;
}

/** One line's release in the end-to-end tests, and what it must produce. */
type EndToEndReleaseCase = {
  /** The branch released from, and the one checked out. */
  sourceBranch: string;
  /** The branch the release publishes to. */
  targetBranch: string;
  /** The other line's branches, which the release must not touch. */
  otherLineBranches: string[];
  version: string;
  nextVersion: string;
  /** package.json on the target branch after the release. */
  publishedVersion: string;
  releaseTag: string;
  /** The tag the other line would have used, which must not appear. */
  otherLineTag: string;
  /** package.json on the source branch after the release. */
  nextDevVersion: string;
};

const END_TO_END_RELEASE_CASES: readonly EndToEndReleaseCase[] = [
  {
    sourceBranch: "alpha-dev",
    targetBranch: "alpha",
    otherLineBranches: ["main", "develop"],
    version: "0.15.0",
    nextVersion: "0.15.1",
    publishedVersion: "0.15.0-alpha",
    releaseTag: "v0.15.0-alpha",
    otherLineTag: "v0.15.0",
    nextDevVersion: "0.15.1-alpha-dev",
  },
  {
    sourceBranch: "develop",
    targetBranch: "main",
    otherLineBranches: ["alpha", "alpha-dev"],
    version: "0.14.2",
    nextVersion: "0.14.3",
    publishedVersion: "0.14.2",
    releaseTag: "v0.14.2",
    otherLineTag: "v0.14.2-alpha",
    nextDevVersion: "0.14.3-dev",
  },
];

/**
 * Fresh repositories under `directory` with `sourceBranch` checked out, and
 * `ava release` pointed at the checkout with its output silenced.
 */
function _checkOutFreshSourceBranch(
  options: Readonly<{ directory: string; sourceBranch: string }>,
): { origin: string; checkout: string } {
  const { directory, sourceBranch } = options;
  const { origin, checkout } = _createReleaseRepos(directory);
  _git({
    cwd: checkout,
    args: ["switch", "-c", sourceBranch, "--track", `origin/${sourceBranch}`],
  });
  vi.spyOn(process, "cwd").mockReturnValue(checkout);
  vi.spyOn(console, "log").mockImplementation(noop);
  vi.spyOn(console, "error").mockImplementation(noop);
  return { origin, checkout };
}

describe.each(END_TO_END_RELEASE_CASES)(
  "ava release end to end on $sourceBranch",
  (releaseCase) => {
    const { sourceBranch, targetBranch, releaseTag } = releaseCase;
    let directory: string;
    let origin: string;
    let checkout: string;
    let tipsBefore: Record<string, string>;
    let tipsAfter: Record<string, string>;

    beforeAll(async () => {
      directory = mkdtempSync(join(tmpdir(), "ava-release-e2e-"));
      _isolateFromUserConfig(directory);
      ({ origin, checkout } = _checkOutFreshSourceBranch({
        directory,
        sourceBranch,
      }));
      tipsBefore = _readBranchTips(origin);
      await runRelease({
        version: releaseCase.version,
        nextVersion: releaseCase.nextVersion,
        yes: true,
        dryRun: false,
        skipCiCheck: true,
        skipChangelog: true,
      });
      tipsAfter = _readBranchTips(origin);
    }, 30_000);

    afterAll(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      rmSync(directory, { recursive: true, force: true });
    });

    /** The `n`th parent of the published target commit, 1-based. */
    const _readTargetParent = (parentNumber: number): string => {
      return _git({
        cwd: origin,
        args: ["rev-parse", `${tipsAfter[targetBranch]}^${parentNumber}`],
      });
    };

    it(`leaves ${releaseCase.otherLineBranches.join(" and ")} on origin untouched`, () => {
      releaseCase.otherLineBranches.forEach((branch) => {
        expect(tipsAfter[branch]).toBe(tipsBefore[branch]);
      });
    });

    it(`gives ${targetBranch} its old tip as the first parent`, () => {
      expect(_readTargetParent(1)).toBe(tipsBefore[targetBranch]);
    });

    it(`gives ${targetBranch} a second parent that is the version commit on the old ${sourceBranch}`, () => {
      const versionCommit = _readTargetParent(2);
      expect(
        _git({
          cwd: origin,
          args: ["log", "-1", "--format=%s", versionCommit],
        }),
      ).toBe(`Release: ${releaseTag} [skip deploy]`);
      expect(
        _git({ cwd: origin, args: ["rev-parse", `${versionCommit}^`] }),
      ).toBe(tipsBefore[sourceBranch]);
    });

    it(`gives ${targetBranch} exactly the version commit's tree`, () => {
      expect(
        _git({
          cwd: origin,
          args: ["rev-parse", `${tipsAfter[targetBranch]}^{tree}`],
        }),
      ).toBe(
        _git({
          cwd: origin,
          args: ["rev-parse", `${_readTargetParent(2)}^{tree}`],
        }),
      );
    });

    it(`publishes package.json at ${releaseCase.publishedVersion} on ${targetBranch}`, () => {
      expect(
        _readPackageVersion({
          repoRoot: origin,
          revision: tipsAfter[targetBranch] ?? "",
        }),
      ).toBe(releaseCase.publishedVersion);
    });

    it(`tags ${targetBranch} with the annotated tag ${releaseTag}`, () => {
      expect(
        _git({
          cwd: origin,
          args: ["cat-file", "-t", `refs/tags/${releaseTag}`],
        }),
      ).toBe("tag");
      expect(
        _git({
          cwd: origin,
          args: ["rev-parse", `refs/tags/${releaseTag}^{commit}`],
        }),
      ).toBe(tipsAfter[targetBranch]);
    });

    it(`creates no ${releaseCase.otherLineTag} tag`, () => {
      expect(
        _git({
          cwd: origin,
          args: ["tag", "--list", releaseCase.otherLineTag],
        }),
      ).toBe("");
    });

    it(`moves ${sourceBranch} to a bump commit at ${releaseCase.nextDevVersion} on top of the version commit`, () => {
      const sourceTip = tipsAfter[sourceBranch] ?? "";
      expect(
        _git({ cwd: origin, args: ["log", "-1", "--format=%s", sourceTip] }),
      ).toBe(`Bump version to ${releaseCase.nextDevVersion} [skip deploy]`);
      expect(_git({ cwd: origin, args: ["rev-parse", `${sourceTip}^`] })).toBe(
        _readTargetParent(2),
      );
      expect(
        _readPackageVersion({ repoRoot: origin, revision: sourceTip }),
      ).toBe(releaseCase.nextDevVersion);
    });

    it(`moves the local ${targetBranch} branch to the release`, () => {
      expect(
        _git({
          cwd: checkout,
          args: ["rev-parse", `refs/heads/${targetBranch}`],
        }),
      ).toBe(tipsAfter[targetBranch]);
    });

    it(`leaves the local ${sourceBranch} at origin's bump commit`, () => {
      expect(
        _git({
          cwd: checkout,
          args: ["rev-parse", `refs/heads/${sourceBranch}`],
        }),
      ).toBe(tipsAfter[sourceBranch]);
    });

    it("leaves the tags named like the branches on main", () => {
      BRANCH_NAMED_TAGS.forEach((tag) => {
        expect(
          _git({ cwd: origin, args: ["rev-parse", `refs/tags/${tag}`] }),
        ).toBe(tipsBefore.main);
      });
    });

    it("leaves the checkout clean", () => {
      expect(_git({ cwd: checkout, args: ["status", "--short"] })).toBe("");
    });
  },
);

describe.each(END_TO_END_RELEASE_CASES)(
  "ava release --dry-run end to end on $sourceBranch",
  (releaseCase) => {
    let directory: string;
    let origin: string;
    let checkout: string;
    let originRefsBefore: string;
    let checkoutRefsBefore: string;
    let headBefore: string;

    beforeAll(async () => {
      directory = mkdtempSync(join(tmpdir(), "ava-release-e2e-dry-"));
      _isolateFromUserConfig(directory);
      ({ origin, checkout } = _checkOutFreshSourceBranch({
        directory,
        sourceBranch: releaseCase.sourceBranch,
      }));
      // Fetched first, so the release's own fetch has nothing left to move.
      _git({ cwd: checkout, args: ["fetch", "--prune", "--tags", "origin"] });
      originRefsBefore = _listRefs(origin);
      checkoutRefsBefore = _listRefs(checkout);
      headBefore = _git({ cwd: checkout, args: ["rev-parse", "HEAD"] });
      await runRelease({
        version: releaseCase.version,
        nextVersion: releaseCase.nextVersion,
        yes: true,
        dryRun: true,
        skipCiCheck: true,
        skipChangelog: true,
      });
    }, 30_000);

    afterAll(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      rmSync(directory, { recursive: true, force: true });
    });

    it("moves no ref on origin", () => {
      expect(_listRefs(origin)).toBe(originRefsBefore);
    });

    it("moves no ref in the checkout", () => {
      expect(_listRefs(checkout)).toBe(checkoutRefsBefore);
    });

    it("leaves HEAD where it was", () => {
      expect(_git({ cwd: checkout, args: ["rev-parse", "HEAD"] })).toBe(
        headBefore,
      );
    });

    it("leaves the checkout clean", () => {
      expect(_git({ cwd: checkout, args: ["status", "--short"] })).toBe("");
    });
  },
);

/** The run URL the mocked CI check reports, for a refusal to name. */
const CI_RUN_URL = "https://github.com/AvandarLabs/avandar/actions/runs/7";

/** Each verdict other than a pass, as the mocked CI check returns it. */
const NON_PASSING_CI_STATUSES: readonly CiStatus[] = [
  { kind: "failed", conclusion: "failure", url: CI_RUN_URL },
  { kind: "pending", status: "in_progress", url: CI_RUN_URL },
  { kind: "missing" },
  { kind: "unknown", reason: "the gh CLI is not logged in" },
];

describe("ava release on alpha-dev with a non-passing CI verdict", () => {
  let directory: string;
  let origin: string;
  let checkout: string;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "ava-release-ci-refusal-"));
    _isolateFromUserConfig(directory);
    ({ origin, checkout } = _checkOutFreshSourceBranch({
      directory,
      sourceBranch: "alpha-dev",
    }));
    // Fetched first, so the release's own fetch has nothing left to move.
    _git({ cwd: checkout, args: ["fetch", "--prune", "--tags", "origin"] });
  });

  afterEach(() => {
    vi.mocked(console.log).mockClear();
    vi.mocked(promptToConfirm).mockReset();
    vi.mocked(checkSourceBranchCi).mockReset();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });

  describe.each(NON_PASSING_CI_STATUSES)("($kind)", (ciStatus) => {
    it.each([true, false])(
      "refuses with --yes %s before any mutating command, without asking",
      async (yes) => {
        vi.mocked(checkSourceBranchCi).mockReturnValue(ciStatus);
        const originRefsBefore = _listRefs(origin);
        const checkoutRefsBefore = _listRefs(checkout);

        await expect(
          runRelease({
            version: "0.15.0",
            nextVersion: "0.15.1",
            yes,
            dryRun: false,
            skipCiCheck: false,
            skipChangelog: true,
          }),
        ).rejects.toThrow(`"${ciStatus.kind}"`);

        expect(promptToConfirm).not.toHaveBeenCalled();
        expect(_listRefs(origin)).toBe(originRefsBefore);
        expect(_listRefs(checkout)).toBe(checkoutRefsBefore);
        expect(_git({ cwd: checkout, args: ["status", "--short"] })).toBe("");
        // Every mutating command is echoed as `$ <command>` before it runs.
        expect(_stdoutText()).not.toContain("$ ");
      },
    );
  });

  it("names the run URL and --skip-ci-check in the refusal", async () => {
    vi.mocked(checkSourceBranchCi).mockReturnValue(
      NON_PASSING_CI_STATUSES[0] as CiStatus,
    );

    const release = runRelease({
      version: "0.15.0",
      nextVersion: "0.15.1",
      yes: true,
      dryRun: false,
      skipCiCheck: false,
      skipChangelog: true,
    });

    await expect(release).rejects.toThrow(CI_RUN_URL);
    await expect(release).rejects.toThrow("--skip-ci-check");
  });
});

/** One release the CI gate must let through, and the verdict it sees. */
type CiGateProceedCase = {
  name: string;
  sourceBranch: string;
  targetBranch: string;
  version: string;
  nextVersion: string;
  releaseTag: string;
  ciStatus: CiStatus;
  skipCiCheck: boolean;
};

const CI_GATE_PROCEED_CASES: readonly CiGateProceedCase[] = [
  {
    name: "alpha-dev with a passed verdict",
    sourceBranch: "alpha-dev",
    targetBranch: "alpha",
    version: "0.15.0",
    nextVersion: "0.15.1",
    releaseTag: "v0.15.0-alpha",
    ciStatus: { kind: "passed", url: CI_RUN_URL },
    skipCiCheck: false,
  },
  {
    name: "alpha-dev with a failed verdict and --skip-ci-check",
    sourceBranch: "alpha-dev",
    targetBranch: "alpha",
    version: "0.15.0",
    nextVersion: "0.15.1",
    releaseTag: "v0.15.0-alpha",
    ciStatus: { kind: "failed", conclusion: "failure", url: CI_RUN_URL },
    skipCiCheck: true,
  },
  {
    name: "develop with a failed verdict and --yes",
    sourceBranch: "develop",
    targetBranch: "main",
    version: "0.14.2",
    nextVersion: "0.14.3",
    releaseTag: "v0.14.2",
    ciStatus: { kind: "failed", conclusion: "failure", url: CI_RUN_URL },
    skipCiCheck: false,
  },
];

describe.each(CI_GATE_PROCEED_CASES)("ava release on $name", (proceedCase) => {
  let directory: string;
  let origin: string;
  let tipsBefore: Record<string, string>;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "ava-release-ci-proceed-"));
    _isolateFromUserConfig(directory);
    ({ origin } = _checkOutFreshSourceBranch({
      directory,
      sourceBranch: proceedCase.sourceBranch,
    }));
    tipsBefore = _readBranchTips(origin);
    vi.mocked(checkSourceBranchCi).mockReturnValue(proceedCase.ciStatus);
  });

  afterAll(() => {
    vi.mocked(checkSourceBranchCi).mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });

  it(`publishes ${proceedCase.targetBranch} and tags ${proceedCase.releaseTag}`, async () => {
    await runRelease({
      version: proceedCase.version,
      nextVersion: proceedCase.nextVersion,
      yes: true,
      dryRun: false,
      skipCiCheck: proceedCase.skipCiCheck,
      skipChangelog: true,
    });

    const tipsAfter = _readBranchTips(origin);
    expect(tipsAfter[proceedCase.targetBranch]).not.toBe(
      tipsBefore[proceedCase.targetBranch],
    );
    expect(
      _git({
        cwd: origin,
        args: ["rev-parse", `refs/tags/${proceedCase.releaseTag}^{commit}`],
      }),
    ).toBe(tipsAfter[proceedCase.targetBranch]);
    expect(promptToConfirm).not.toHaveBeenCalled();
  }, 30_000);
});

describe("ava release --help", () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    process.argv = [process.execPath, "ava", "release", "--help"];
    vi.spyOn(console, "log").mockImplementation(noop);
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it("says alpha-dev refuses any CI verdict but a pass, even with --yes or --dry-run", async () => {
    await ReleaseCli.state.action?.({
      version: "",
      next: "",
      yes: false,
      dryRun: false,
      skipCiCheck: false,
      skipChangelog: false,
    });

    // Collapsed so the assertions survive re-wrapping the help text.
    const stdout = _stdoutText().replace(/\s+/g, " ");
    expect(stdout).toContain(
      "On alpha-dev, anything but a pass (failed, pending, missing, or unknown) refuses the release, even with --yes",
    );
    expect(stdout).toContain("refuses --dry-run too");
    expect(stdout).toContain(
      "On alpha-dev, refused while CI is not green unless --skip-ci-check is passed.",
    );
    expect(stdout).toContain("deploys production without alpha-dev's CI");
  });
});
