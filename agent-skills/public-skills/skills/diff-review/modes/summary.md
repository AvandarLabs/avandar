# Summary

Summary mode is read-only and explicit-only.

1. Resolve the transcript and guides from the requested or default comparison.
2. If the transcript is absent or empty with no guides, report that no review
   exists and offer Initial mode: `dif` creates an empty transcript at launch,
   so its presence proves nothing. A zero-thread transcript is valid only when
   both guide artifacts exist; if either is missing, report the review as
   incomplete and offer regeneration.
3. Otherwise reconstruct the navigation summary from the transcript and guide.
   Use the highest `claude-r<N>-*` id as the round, or round 1 when no such id
   exists. Include the repository run command, even for a transcript containing
   reviewer comments.
4. Output only the summary block.

Do not write artifacts, source files, commits, or comments in Summary mode.
