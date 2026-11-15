# Reporting

The command the user runs to open the review, the comparison handoff to a live
session, and the navigation summary that Initial, Continue, and Summary send.

## Repository run command

In Initial mode, ensure the script and detect the package manager:

```bash
python3 <skill-dir>/scripts/ensure-command.py
sh <skill-dir>/scripts/detect-pm.sh
```

In PR review and Summary mode, preserve the reviewed source: use the package
script only if it already exists, otherwise use the direct runner. Package
manager detection is read-only and remains safe.

Format the final line from their output and the selected comparison:

- pnpm, yarn, or bun: `→ Run: <pm> diff-review <args>`
- npm: `→ Run: npm run diff-review -- <args>`
- npm without args: `→ Run: npm run diff-review`
- No package script, including `NO_PACKAGE_JSON`:
  `→ Run: sh <skill-dir>/scripts/dif/run.sh <args>`

If a live session for the current branch has `comparison_update_url`, notify it
before reporting the run command. Prefer the matching comparison or the sole
unambiguous session. POST `{"comparisonKey":"<selected-key>"}` to that URL.
HTTP 202 means accepted; 409 means the review is already prepared and its
comparison is settled. Missing, ambiguous, or failed handoff is non-fatal.

Do this handoff early, before writing any artifact. `dif` honors it only while
no guide exists and the reviewer has not commented yet; after that it keeps the
comparison the reviewer is already looking at.

When a live session already covers the selected comparison, the reviewer's
browser is open on this diff, so a run command is noise. Replace the final
`→ Run:` line with:

```text
→ Review is live · no relaunch needed
```

## Chat output

After Initial and manual Continue rounds, send one raw-markdown navigation
summary of at most 30 lines. Do not fence it, paste JSON, narrate individual
comments, or use a table for files.

Include the round, branch and comparison, counts, concern groups in review
order, each file's thread count and a tag of at most six words, and the next
step. Add a one- or two-sentence file-purpose continuation only when the path,
tag, and group do not reveal the file's role. For tiny diffs, omit group
headings.

```text
┌─ ROUND <N> · <branch> vs <comparison> ──────────────┐
│  <thread-count> threads · <file-count> files        │
└─────────────────────────────────────────────────────┘

**GROUP 1: <name>**  *(<orientation>)*
  ├─ `<path>`  [<n> threads] · <tag>
  └─ `<path>`  [<n> threads] · <tag>

→ Run: `<repository command>`
```

When a live session already covers this comparison, end with
`→ Review is live · no relaunch needed` instead of the run command.

A manual Continue summary also includes Addressed, New, and Open counts, plus
commits made in that round. End it with
`→ Reply posted live · no relaunch needed` instead of a run command.
