# Private Skills

This directory holds agent skills that are **specific to the Avandar
repository**. Unlike [`../public-skills/`](../public-skills), these skills
are **not intended to be installed into other repositories at all**.

They edit or reason about files that only exist in the `avandar`
repository. If you install one of these into an unrelated repository, it
will not do anything useful there, because the files it operates on will
not exist.

For that reason there is **no `npx skills` install command** for this
directory. These skills are discovered locally, in this repo, through the
symlinks created by [`../symlink-skills-dirs.sh`](../symlink-skills-dirs.sh),
exactly like the public skills are. They are versioned with the repo and
edited in place.

## Every skill here must be symlinked

Like the public skills, every skill under `private-skills/` must be
symlinked into each supported agent's skills directory so the agent can
discover it. Do not create the symlinks by hand; run:

```bash
./agent-skills/symlink-skills-dirs.sh
```

The script walks all of `agent-skills/` (both `public-skills/` and
`private-skills/`), so it picks these skills up automatically. Run it
whenever you add, remove, or rename a skill here.

## Available Skills

### writing-code-review-rules

The maintainer-facing counterpart to the public `avandar-code-review`
skill. Use it whenever you add, edit, or remove a review rule, either in
`avandar-code-review`'s built-in checklists or in a repo's repo-local
`docs/code-reviews/extra-checklist.md`.

It enforces a fixed pass order: first place the rule in the correct file
(public skill vs. repo-local extra checklist), then, only if needed,
check whether the edited checklist has grown large or incoherent enough to
warrant a new find-lane split in `avandar-code-review`, and keep the
skill's sub-agent orchestration (find lanes and phase list) in sync. It
also documents the Rule Pattern that keeps rules optimized for LLM
interpretability and accuracy.
