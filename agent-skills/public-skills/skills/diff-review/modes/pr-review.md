# PR review

1. For a PR number or URL, read its description and base before fetching code:

   ```bash
   python3 <skill-dir>/scripts/get-pr-info.py <number>
   ```

   Follow the user's worktree conventions. Otherwise fetch the PR head into a
   temporary `review/pr-<number>` branch and worktree:

   ```bash
   git fetch origin pull/<number>/head
   git worktree add <worktree-path> -b review/pr-<number> FETCH_HEAD
   ```

   Fetch the base branch if needed. For a local diff critique, skip this step
   and remain in the current worktree.
2. Load project instructions, contributing guidance, lint configuration, and
   applicable code-review skills. This skill defines the workflow, not the
   project's review rules. Also load
   [`references/review-comment-style.md`](../references/review-comment-style.md),
   plus `~/.diff-review/review-comment-style.md` when it exists, before writing
   any finding. This mode is the reviewer voice, never the reply voice.
3. Review the PR with `git diff <baseRefName>...HEAD`; for a local critique,
   review the selected comparison. Check correctness, edge cases, architecture,
   data modeling, documented conventions, and useful nits.
4. Write one thread per finding, then use the Initial artifact, validation,
   coverage, reporting, and walkthrough steps with the selected comparison.

Do not change, commit, push, or merge the contributor's code.
