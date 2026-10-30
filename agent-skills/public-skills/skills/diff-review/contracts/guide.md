# Diff guide contract

The guide is a complete, stable partition of the current diff. Every file must
appear exactly once in `-guide.md`, `-guide.json`, and the group roster in
`-reviewed.json`. Reviewed groups remain in both guides; their statuses show
completion. This invariant keeps the web shell's "new files not in guide"
signal meaningful.

Group files by one cohesive concern and order groups so earlier groups provide
context for later ones. Prefer small groups when a natural seam exists, but do
not split a cohesive change merely to reduce its file count. Preserve group
numbers for the life of the review; new groups take the next unused number.

Put generated and non-reviewable artifacts in one final group named
`Generated: review not required`, with `kind: "generated"`, zero threads, and
`reviewed` status so they do not inflate remaining-review counts. Do not store
review signatures or write explainer threads for them.

Contents:

- [Rendered guide](#rendered-guide)
- [Structured guide](#structured-guide)
- [Reviewed state](#reviewed-state)
- [Regenerating the guide](#regenerating-the-guide)
- [Summary and test plan](#summary-and-test-plan)

## Rendered guide

```markdown
# Diff guide: <branch> vs <comparison>

_<n> threads · <n> files_

## Group 1. <group name>

<optional one-line orientation>

| File | Threads | Status | Note |
| --- | --- | --- | --- |
| `src/a.rs` | 2 | pending | <six-word tag> |
| `src/b.rs` | 1 | ✅ reviewed | <tag> |
| `src/c.rs` | 3 | ⚠️ changed since review | <tag> |
```

## Structured guide

Write `-guide.json` in lockstep with `-guide.md`:

```jsonc
[
  {
    "n": 1,
    "kind": "bug",
    "ticket": "PP-39",
    "name": "mixed-media child ordering",
    "orient": "One-line orientation.",
    "files": [
      {
        "path": "src/a.ts",
        "tag": "assigns sibling order at save",
        "threads": 1,
        "status": "pending"
      }
    ]
  }
]
```

Use exact repo-relative paths. `threads` counts `claude` threads for the file.
Allowed status values are `pending`, `reviewed`, and `changed`.

After every guide write, run the deterministic coverage gate until it passes:

```bash
python3 <skill-dir>/scripts/check-guide-coverage.py <guide-json-path> <comparison-key>
```

## Reviewed state

```jsonc
{
  "groups": [
    { "n": 1, "name": "...", "files": ["src/a.rs", "src/b.rs"] }
  ],
  "reviewedGroups": [],
  "reviewedFiles": {
    "src/b.rs": "<git hash-object output>"
  },
  "changedFiles": ["src/c.rs"]
}
```

Use `git hash-object -- <path>` as the reviewed-file signature.
Initialize all three state collections as empty for a new review.

- Marking a group reviewed adds its number to `reviewedGroups` and records all
  file signatures. Keep the group in the guides with reviewed statuses.
- Marking one file reviewed records its current signature.
- During regeneration, compare stored signatures with current content. Remove
  stale signatures, add those paths to `changedFiles`, remove affected groups
  from `reviewedGroups`, and mark those files `changed`. Keep them in
  `changedFiles` until reviewed again, then remove them from that list.
- Reconcile state with the new roster: remove absent paths from `reviewedFiles`
  and `changedFiles`, and remove group numbers absent from the current roster
  from `reviewedGroups`. When a retained group's file membership changes,
  remove it from `reviewedGroups` unless every current reviewable file has a
  current signature.
- Answer "what is reviewed?" from `-reviewed.json`; answer "what remains?" from
  its current signatures and the guide roster.

## Regenerating the guide

Diff guide mode, and Continue after a code change, regenerate the guide the
same way:

1. Re-derive the complete file roster. Reuse existing groups, preserve numbers,
   and append only genuinely new groups.
2. Recompute reviewed signatures and demote changed files, per
   [Reviewed state](#reviewed-state).
3. Write reviewed state and both guides, then pass the coverage gate.

## Summary and test plan

Write `-summary.md` and `-test-plan.md` for a new review. Regenerate either only
when its content becomes stale.

The summary is a markdown list of at most three one-sentence bullets describing
the diff at a high level. Do not include file inventories or test steps.

The test plan is a numbered list of concrete manual steps. Include exact paths,
clicks, and commands. Put commands in fenced code blocks and literal text the
user must copy in blockquotes or another isolated markdown block.
