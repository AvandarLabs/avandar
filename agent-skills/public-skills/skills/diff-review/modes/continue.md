# Continue

Continue has two entry paths: Injected handles one comment typed by the TUI;
Manual discovers all open comments from the transcript. This path is unrelated
to the `/diff-review auto <PR-number>` alias for PR review.

1. Read the matching `.difit/.session-<branch-slug>-<scope-slug>.json` for the
   live `port`, `comments_file`, and `comparison_key`. Read the mirrored
   transcript once for context. Never write it; the TUI poller owns it.
2. An open comment is a non-`claude` entry without a later `claude` reply at the
   same `filePath` and `position`. Classify it as a question, change request, or
   both. Do not edit code for a question alone.
3. When changing code, ensure the result remains visible to the active
   comparison. The bundled runner always uses these semantics:
   - A committed branch comparison, such as `develop`, `main`, or another
     ref: run relevant checks and automatically commit the complete
     comment-addressing change.
   - An unstaged comparison, such as `.` or `working`: make the requested
     changes without committing them. Tracked edits may remain unstaged and
     new files may remain untracked.
   - `staged`: stage every tracked edit and new file. `git add -N` is
     insufficient.
   - Inspect `git status` before replying.
4. Read [`references/reply-style.md`](../references/reply-style.md), plus
   `~/.diff-review/reply-style.md` when it exists, before writing any reply.
   This mode is the engineer voice, never the reviewer voice. Then create only
   new entries. A question requires a reply. A completed change may omit the
   reply or use `Done.`; if declining a requested change, explain why in a
   reply. Copy the parent location exactly and use fresh ids and timestamps.
5. Validate the full transcript plus new entries in a temporary file, or for one
   reply verify its parent location exactly. POST only new entries:

   ```bash
   curl -sS -X POST "http://localhost:<port>/api/comment-imports" \
     -H 'Content-Type: application/json' \
     --data '<json-array-of-new-entries>'
   ```

6. If code changed, regenerate the guides and reviewed signatures, per
   [Regenerating the guide](../contracts/guide.md#regenerating-the-guide), and
   update the summary or test plan only if stale. Never
   touch the walkthrough, even when the change makes it stale, per
   [When a walkthrough is written](../SKILL.md#when-a-walkthrough-is-written).
7. Report according to the entry path:
   - Injected question with no code edit: compose the reply body once, POST it,
     then send that exact body as the entire chat response.
   - Injected change request: explain the completed work normally in chat. Keep
     any difit reply terse.
   - Manual: send the Continue navigation summary.

The POST updates the open browser live; do not restart `dif`.
