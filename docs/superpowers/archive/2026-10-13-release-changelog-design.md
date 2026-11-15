# Automated GitHub release notes for `ava release`

## Problem

`ava release` cuts and tags a new version (`vX.Y.Z`) but never creates a
GitHub Release for it. `gh release list` shows releases for individual
packages (`@avandar/hooks@0.1.2`, etc.) but nothing for the app version tags
the release command itself produces. Release notes, when they exist at all,
are written by hand after the fact.

## Goals

- `ava release` automatically creates a GitHub Release for the tag it just
  pushed, with notes generated from the commits since the previous version
  tag.
- Notes are cleaned up by an LLM: commits with an already-clear, short
  message are kept verbatim; commits with an unclear or overlong message are
  rewritten from their diff into a 1-2 sentence summary; nit-level changes
  (typos, formatting, comments) are bundled into a single bullet listing all
  their commit hashes.
- If note generation or publishing fails, the release still completes
  (main/tag are already pushed by that point), and the run tells the user
  the exact command to retry it later.
- That retry path is a real, standalone command: `ava release notes
  [--version X.Y.Z]`, which can also be used any time to (re-)publish notes
  for an already-tagged version, and refuses to overwrite a release that
  already has notes.

## Non-goals

- No in-repo `CHANGELOG.md`. This only publishes to GitHub Releases, per the
  request.
- No per-PR metadata lookups (labels, reviewers, etc.) via `gh pr list`. This
  repo squash-merges PRs, so a commit's subject already carries `(#123)` when
  it came from one; plain `git log` / `git show` is sufficient.
- No attempt to make commit-message policy (e.g. Conventional Commits)
  mandatory going forward. The LLM step exists precisely because the history
  is not reliably structured.

## Why not an existing tool

| Tool | What it does | Why it doesn't cover this |
|---|---|---|
| `gh release create --generate-notes` | Groups merged PRs by label into a "What's Changed" list via GitHub's Release Notes API | No message cleanup, no diff inspection, no nit-grouping, and depends on PR labels this repo doesn't use |
| `git-cliff` | Templates a changelog from Conventional Commit prefixes | History here is only partially conventional; never reads diffs or rewrites a message |
| `release-please` / `semantic-release` | Conventional-commits-driven versioning + changelog | Same conventional-commit dependency, and both want to own version bumping, which conflicts with the existing bespoke release flow |

None of these make a judgment call by reading a diff, which is the actual
requirement here, so a small custom OpenAI call is the right tool. This
mirrors the existing precedent in `scripts/i18n/translateWithLlm/`: OpenAI
Chat Completions, key from `.env.development`, model name as one named
constant.

## Design

### Module layout

New directory `apps/ava-cli/src/ReleaseCli/releaseChangelog/`:

- `releaseChangelogConfig.ts` — the hardcoded model name and any other
  tunable constants (OpenAI URL, per-commit diff character budget), each with
  a short comment explaining the choice, so the model is trivial to find and
  change later.
- `collectReleaseChangelogCommits.ts` — resolves the previous tag and gathers
  the filtered, diff-bearing commit list described below.
- `generateReleaseNotes.ts` — builds the prompt, calls OpenAI, and renders
  the final markdown.
- `publishReleaseNotes.ts` — orchestrates the above against `gh`, returning a
  typed outcome (below) rather than throwing for any expected condition.

New sibling command `apps/ava-cli/src/ReleaseCli/ReleaseNotesCli.ts`,
registered on `ReleaseCli` the same way `GetProdVersionCli` is today.

### Commit collection

- Tags are fetched from origin first (`git fetch --tags origin`, read-only),
  so a stale local checkout can't miss the newest tag or misjudge the
  previous one.
- The previous tag is the local `v*` tag immediately before the target tag
  in **semver order** (not git ancestry), matching "the previous version."
  If there is no earlier tag (first-ever release), the whole history up to
  the target tag is used, with a printed warning that the result may be
  large.
- Commit range: `git log <previousTag>..<releaseTag> --no-merges`. The
  two-parent release commit (`commit-tree` output, see
  `releaseGitHelpers.ts`) is excluded for free by `--no-merges`.
- Two more commits are filtered out by exact structural regex, independent
  of knowing this particular release's version numbers (so the same filter
  works when `ava release notes` is run standalone, cold, against an
  arbitrary past tag):
  - `/^Release: v\d+\.\d+\.\d+ \[skip deploy\]$/`
  - `/^Bump version to \d+\.\d+\.\d+-dev \[skip deploy\]$/`
- Every remaining commit contributes: short SHA, subject, `git show --stat`,
  and a diff truncated to a fixed character budget (constant in
  `releaseChangelogConfig.ts`), so one large squash-merge can't blow the
  prompt.

### Note generation

- One OpenAI Chat Completions call (`response_format: { type: "json_object"
  }`), given each commit's subject + stat + (possibly truncated) diff. The
  system prompt instructs the model to:
  - keep an already-clear, short subject verbatim,
  - rewrite only unclear or overlong subjects into a 1-2 sentence summary
    drawn from the diff,
  - bundle nit-level commits (typos, formatting, comments) into one bullet
    per cluster, carrying every contributing commit hash.
  - Response shape: a flat array of `{ group: string, text: string,
    commits: string[] }`.
- **Render rule, applied in code, not left to the model:** count bullets per
  `group`. If at least 2 distinct groups have 2 or more bullets each, render
  sectioned markdown (`## <group>` headers, in first-seen group order);
  otherwise flatten into one bullet list with group labels dropped. This
  keeps the formatting decision deterministic and unit-testable without
  hitting the network.
- `OPENAI_API_KEY` is read via the existing `AvaEnv.requireVar`, which every
  `ava` invocation already loads from `.env.development` (or `.env.staging`
  / `.env.production` under those flags, though this command has no reason
  to be run under those). No new env-loading code.

### Publishing

```ts
type PublishReleaseNotesOutcome =
  | { kind: "published"; url: string }
  | { kind: "previewed"; notes: string }   // dry run: OpenAI ran, gh did not
  | { kind: "already-exists"; url: string }
  | { kind: "no-changes" }                 // nothing left after filtering
  | { kind: "tag-not-found" }              // releaseTag doesn't exist yet
  | { kind: "failed"; reason: string };
```

`publishReleaseNotes(git, { releaseTag, dryRun })`:

1. Fetch tags from origin, then confirm `releaseTag` exists (local or
   origin); otherwise return `tag-not-found`. The in-flow caller from
   `runRelease` can never hit this (it just created the tag), but the check
   lives here once rather than being duplicated at each call site.
2. `gh release view <releaseTag>`; a release that already exists returns
   `already-exists` rather than being overwritten.
3. Resolve the previous tag and collect commits; an empty list after
   filtering returns `no-changes`.
4. Call `generateReleaseNotes`; on dry run, return `previewed` with the
   rendered notes and stop (no `gh` mutation).
5. Otherwise (real run only; step 4 already returned on a dry run) publish
   via `git.mutate("gh", ["release", "create", releaseTag, "--title",
   releaseTag, "--notes", notes])`, consistent with every other mutation in
   this command. A `gh` failure returns `failed` with its stderr.

The function never throws for any of the above; the two call sites decide
how loud to be.

### Wiring into `runRelease`

Called once, immediately after `publishMainAndTag` succeeds (tag and main
are already pushed). Outcome handling:

- `published` → nothing extra to print; the existing `Tag:
  https://github.com/.../releases/tag/vX.Y.Z` line in `printReleaseSummary`
  is already the release URL.
- `previewed` → notes printed to the terminal under a heading (dry run
  only).
- `no-changes` → one informational line, not a warning.
- `already-exists` / `tag-not-found` / `failed` → `printWarn` (the last two
  should never happen here in practice, since the tag was just created and
  cannot yet have a release); the release still completes, and the final
  summary prints a concrete retry line: `Retry publishing release notes: ava
  release notes --version X.Y.Z`.

Adds `--skip-changelog` to `ava release`, mirroring `--skip-ci-check`, as an
upfront escape hatch (e.g. no network access at release time).

### `ava release notes` command

- `ava release notes --version X.Y.Z [--dry-run]`.
- No `--version` → interactive prompt via the existing `promptForVersion`,
  defaulting to the most recent local `v*` tag.
- Calls `publishReleaseNotes` and maps outcomes to CLI behavior:
  - `tag-not-found` → hard error (exit 1): no such release to publish notes
    for.
  - `already-exists` → hard error (exit 1): this command's whole purpose is
    a fresh publish, so it must never silently no-op or overwrite.
  - `no-changes` → informational message, exit 0.
  - `previewed` → print the notes, exit 0.
  - `published` → print success with the release URL, exit 0.
  - `failed` → hard error (exit 1) with the underlying reason.

## Testing

**No test may call the real OpenAI API.** Every path that reaches
`generateReleaseNotes` in a test takes an injected `fetchImpl` (the
`translateWithLlm` pattern) returning a canned response; the real
`globalThis.fetch` default is never exercised in the test suite. This is a
hard requirement, not a style preference: a forgotten mock means a test run
silently spends real API credits.

Following the repo's existing patterns otherwise:

- Fake `ReleaseCommands` (as in `runPreflight.test.ts`) for
  `publishReleaseNotes` orchestration tests, covering all six outcomes.
- Dependency-injected `fetch` (as in `translateWithLlm`'s `fetchImpl`) for
  the OpenAI call, so no test hits the network.
- Pure unit tests with no I/O: previous-tag resolution, housekeeping-commit
  filtering, and the flat-vs-sectioned render rule.
- `ReleaseNotesCli` flag parsing and help text, mirroring
  `releaseFlagUtils.test.ts`.
- `gh release view` / `gh release create` are always exercised through the
  fake `readCommand` / `mutate`, never the real CLI.

## Open edge cases, resolved here rather than left ambiguous

- **First-ever release (no previous tag):** full history is used, with a
  printed warning about size, rather than failing outright.
- **`already-exists` during the automatic in-flow publish:** should not
  normally happen (the tag was just created), but if it does (e.g. a prior
  partial run already published notes for this exact tag), it is treated
  the same as any other publish failure: warn, finish the release, print the
  retry command.
