# Initial

The reviewer is very likely already looking at this diff: `dif` opens difit
immediately and only then asks for the review. Write artifacts as you finish
them rather than batching everything to the end, so the browser fills in
progressively. The guides are what the reviewer is waiting on, so they go up
first. Explainer threads come after the walkthrough, because they cite its
sections, and the walkthrough takes longer than everything else combined.

1. Resolve the repo root, branch, comparison, stem, and artifacts. Do the
   comparison handoff now if a live session needs it.
2. If `.difit/<exact-branch-name>_explanations.md` exists, use it as a candidate
   list but verify each entry against the current diff. Otherwise inspect:
   - `.`: `git diff HEAD`, plus untracked files
   - `staged`: `git diff --staged`
   - `working`: `git diff`, plus untracked files
   - branch: `git diff <base>...HEAD`
3. Write all guide artifacts, with thread counts taken from the transcript as
   it stands. Initialize reviewed state only when it is absent; otherwise
   preserve and reconcile it. Pass the coverage gate.
4. When `-walkthrough.md` does not exist for the selected comparison, write it
   by running steps 2 to 11 of [Walkthrough](walkthrough.md). When it exists,
   leave it untouched, per
   [When a walkthrough is written](../SKILL.md#when-a-walkthrough-is-written).
5. Write the explainer threads per
   [As the reviewer](../contracts/transcript.md#as-the-reviewer): list the
   changed units, give every core unit a thread, citing the walkthrough only
   where it adds understanding, and confirm with the script that every unit
   left without a thread is exempt.
   For a new round on an existing transcript, preserve every entry and append
   only new `claude` threads; never replace the conversation with the new
   round alone. With a live session, follow [Writing the transcript while a
   session is live](../contracts/transcript.md#writing-the-transcript-while-a-session-is-live).
6. Validate the transcript, then update the guides' thread counts and pass the
   coverage gate again.
7. Send the Initial chat summary. When this round wrote the walkthrough, follow
   it with the report from step 12 of [Walkthrough](walkthrough.md).

A reviewer comment may arrive mid-round: `dif` types it into your input as soon
as it is written, so it lands as a queued message while you work. Before the
guides are written, finish them first. After that, answer the comment as a
Continue round at the next break between steps, then resume the Initial round
where it stopped: a reviewer should not wait for a walkthrough to get a reply.
When the reply changed code, the walkthrough describes the code as it stands
after that change.

Except for the package script added by `ensure-command.py`, do not change source
files, commit, push, or merge in Initial mode.
