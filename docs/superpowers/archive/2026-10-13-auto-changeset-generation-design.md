# Auto Changeset Generation Design

## Context

`packages/**` versioning and publishing already runs through Changesets
(`.changeset/config.json`) and `.github/workflows/release-packages.yaml`: a
pending `.changeset/*.md` file describes a change, `changesets/action` bundles
all pending files into a single "Release: @avandar packages" PR on `develop`,
and merging that PR publishes to npm via OIDC trusted publishing. All ten
`@avandar/*` packages are in one `fixed` group, so any changeset naming one of
them bumps all ten together.

The weak link is step one: a developer must remember to run `pnpm changeset`
by hand for every PR that touches `packages/**`. Forgetting it is silent and
unrecoverable after the fact, the code still ships on the next release, but
with no changelog line describing what changed, because `pnpm changeset` has
no way to retroactively discover an undocumented past commit.

`develop`'s history also mixes merge strategies: some PRs land as a single
squash commit (`Title (#123)`), others as a real merge commit that drags in
every original commit from the branch. Any design that parses "the commit
message of this push" has to account for both.

## Goals

- A push to `develop` that touches `packages/**` gets a changeset
  automatically, with no developer action required beyond opening and merging
  a normal PR.
- The only manual step in the whole pipeline remains merging the
  "Release: @avandar packages" PR.
- A PR that already added its own changeset is left alone.
- The inferred bump type (patch/minor/major) is derived from the PR title
  (Conventional Commits format), falling back to the source branch's
  `feat/`/`fix/`/etc. prefix when the title doesn't parse.
- While any `@avandar/*` package is still on a `0.x.y` version, an inferred
  breaking change never bumps to `1.0.0` on its own; it bumps the minor digit
  instead, per standard pre-1.0 semver convention. Only a human manually
  authoring a changeset with an explicit `major` bump can cross that line.
- PR titles are enforced in CI to match the Conventional Commits format this
  inference depends on, and the required format is documented in `AGENTS.md`.
- No change's packages are ever silently dropped from the changelog, even
  across multiple pushes landing before a Version PR is merged.

## Non-Goals

- No static API-diffing (there is no TypeScript equivalent to
  `cargo-semver-checks` in wide use); bump inference trusts the PR
  title/branch name, not an analysis of the actual API surface.
- No change to `fixed`/`linked` grouping, `access`, or any other
  `.changeset/config.json` setting.
- No change to the Avandar app's own release process
  (`apps/ava-cli`'s `ava release`, the root `package.json` version). That stays
  manual, as documented in `.changeset/README.md`.
- No enforcement of Conventional Commits on every individual commit, only on
  PR titles, since that's the one message guaranteed to exist regardless of
  merge strategy.
- No retroactive backfill for changes already merged without a changeset
  before this ships.

## Considered Approaches

### One rolling changeset file, rewritten on every push

A single auto-generated file (e.g. `.changeset/auto-pending.md`) gets read,
merged with the newly touched packages, and rewritten on every push. Rejected:
it requires conflict-safe read-modify-write handling for pushes that land
close together, it has no correctness advantage over the alternative below
(the `fixed` group already guarantees every package bumps together regardless
of which file names it), and it degrades changelog attribution, since every
rewrite after the first is authored by the bot rather than by the commit that
introduced it.

### One new changeset file per push (selected)

Each push that needs one gets its own `.changeset/auto-pr-<number>.md`. This
is how Changesets is meant to be used already: many small pending files
accumulating until one Version PR consumes all of them. No shared-file races,
clean per-change changelog attribution, and trivial idempotency (the filename
itself prevents double-processing a PR).

### Parse raw commit messages vs. resolve the merging PR via the GitHub API

Parsing `git log` messages directly is unreliable here because a real (non-squash)
merge commit drags in every original commit from the feature branch, including
messy WIP messages never meant to describe the change as a whole. Resolving
each commit's associated PR via `gh api repos/{repo}/commits/{sha}/pulls`
(selected) gives one canonical title and branch name per PR regardless of
merge strategy, and keeps working for the branch-name fallback even after the
branch is deleted post-merge.

## Architecture

A new step is added to `.github/workflows/release-packages.yaml`, in the
existing `release` job, immediately after checkout and before `type-check`,
`test`, and `verify:packages`. It only runs `if: github.event_name == 'push'`;
a manual `workflow_dispatch` run has no push range to diff and skips it. The
job's existing permissions (`contents: write`, `pull-requests: write`) and
`fetch-depth: 0` checkout already cover what this step needs.

The step runs a new script, `scripts/ci/ensure-changesets/ensureChangesets.ts`,
executed via `pnpm vite-script` (this repo's existing `vite-node`-based script
runner), since this repo's sibling modules use extensionless relative imports
that plain Node ESM cannot resolve on its own. The bump-inference logic is
split into small, independently testable pure functions alongside it (exact
module layout is finalized during planning), following this repo's pattern of
colocating a tested module with its test file (see `scripts/db/*` for
examples). The orchestration (GitHub API calls, git commit/push) stays thin
and is not unit tested; the pure logic it calls into is.

## Data Flow

For the push range `github.event.before`...`github.event.after`:

1. List the commits introduced (`git log --format=%H <before>..<after>`).
2. For each commit, resolve its merged PR via
   `gh api repos/{repo}/commits/{sha}/pulls`. Dedupe to distinct PR numbers. A
   commit with no associated PR (a direct push to `develop`) is bucketed
   separately and falls back to using its own commit message as both the
   summary and the bump-inference source, with no branch-name fallback
   available.
3. For each distinct PR:
   a. Fetch its changed files (`gh api repos/{repo}/pulls/{n}/files`) and
      filter to `packages/<name>/**`, mapping each touched package directory
      to the `name` field in its `package.json`.
   b. If none of the PR's files are under `packages/**`, skip it.
   c. If the PR's own file list already includes a new `.changeset/*.md`, skip
      it, that developer already wrote one by hand.
   d. If `.changeset/auto-pr-<n>.md` already exists on `develop` (a retry or a
      re-run of a previous attempt), skip it.
   e. Infer the bump type (see table below) from the PR title, falling back to
      the PR's `head.ref` branch name if the title doesn't parse as a
      Conventional Commit.
   f. Read the current version from any one `fixed`-group package's
      `package.json` (they're locked together). If its major is `0` and the
      inferred bump is `major`, cap it to `minor`.
   g. Write `.changeset/auto-pr-<n>.md`: frontmatter lists exactly the
      packages this PR touched (not all ten blindly, so each package's own
      `CHANGELOG.md` stays accurate even though the `fixed` group bumps all of
      them in lockstep); body is the PR title.
4. If any files were generated, stage them, make one commit covering every PR
   in this push (`chore: add changesets for #123, #124 [skip deploy]`), and
   push to `develop` before the job continues to `type-check`.

Bump inference table:

| Signal | Bump (major == 0) | Bump (major >= 1) |
|---|---|---|
| `feat` | minor | minor |
| `fix`, `refactor`, `chore`, `docs`, `test` | patch | patch |
| `!` after type, or `BREAKING CHANGE:` footer | minor (capped) | major |
| unparseable from title or branch name | patch | patch |

Because the commit pushed by this step is authored via the job's
`GITHUB_TOKEN`, it does not retrigger `release-packages.yaml`'s `push` trigger
(GitHub's own loop prevention for `GITHUB_TOKEN`-authored pushes), so there is
no infinite-loop risk and no need for a separate skip-marker check. The rest
of the job, including the `changesets/action` step, continues against the
now-updated local checkout in the same run, so the newly generated changeset
is picked up immediately rather than waiting for a future push.

## Error Handling

If the GitHub API lookup fails or is rate-limited, the step logs a
`::warning::` annotation and exits successfully rather than failing the job.
A transient API failure must not block `type-check`/`test`/`verify:packages`,
or stop an already-pending Version PR from progressing on an unrelated
changeset. The worst case is a PR missing its changeset, recoverable with a
manual `pnpm changeset`, not a correctness failure like a lost version bump.

A push whose `before` SHA is the all-zero value (new branch creation) or is
not an ancestor of `after` (a force-push) is treated as "nothing to diff" and
skipped with a warning, rather than guessed at.

## Enforcement

- `pr-develop.yaml` gets a new `lint-pr-title` job, triggered on
  `pull_request: [opened, synchronize, reopened, edited]` against `develop`,
  using `amannn/action-semantic-pull-request` configured with
  `types: [feat, fix, refactor, chore, docs, test]`. It needs no Supabase or
  Playwright setup, so it stays fast and runs independently of the other jobs.
- `AGENTS.md` (the real file; `CLAUDE.md` is a symlink to it) gets a new
  section documenting the required PR title format
  (`type(scope)!: subject`), reusing the same six prefixes already used for
  branch names, and explaining why: it's what the auto-changeset step reads to
  infer the bump.

## Testing

- Pure bump-inference logic (Conventional Commit parsing, branch-prefix
  fallback, the pre-1.0 major-to-minor cap, mapping changed file paths to
  package names) is covered with Vitest unit tests asserting on the inferred
  bump for each input shape in the table above, including the capping
  behavior at `0.x` vs `>=1.0`.
- The orchestration script's GitHub API calls and git operations are not unit
  tested; they're exercised by running the real workflow. A failure there is
  caught by the soft-fail warning path, not by test coverage.
- `lint-pr-title`'s behavior is the third-party action's own responsibility;
  no new test is written for it, only its configuration is reviewed.
