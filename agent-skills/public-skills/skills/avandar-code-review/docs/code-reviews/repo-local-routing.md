# Repo-local routing and rule placement

## Additional Checklist File

This skill ships with a template at
`skills/avandar-code-review/docs/code-reviews/extra-checklist.md`.

The actual repo-local checklist used during reviews lives at
`docs/code-reviews/extra-checklist.md` in the repo under review.

- Use the repo-local file as a final phase after finishing the built-in
  phases in this skill. **Skip it entirely on a focused review.**
- Only consult the repo-local file if it exists. If it does not exist, do
  nothing.
- Treat the repo-local file as additional repo-specific rules that
  supplement this skill without replacing the main checklists.
- **`extra-checklist.md` is an extensible ENTRY POINT, not necessarily a
  single flat file to scan.** It may declare several repo-local phases, and
  any phase may delegate to a further ruleset file (for example under
  `docs/code-reviews/references/`). When it points to other files, follow
  every reference and run each referenced ruleset as its own phase, exactly
  like the skill's built-in phases. A repo can grow its review arbitrarily
  this way: `extra-checklist.md` stays the one file this skill opens, and any
  number of additional phases hang off it by reference. On a **full review**,
  these repo-local phases count as real phases, so they also feed the fan-out
  decision (see "When To Fan Out") and each fans out as its own find lane.
  On a focused review they do not run and do not count.
- If the user says to add a new common mistake, says "remember this in the
  future", says "add this to common mistakes", or says "add this to my
  review checklist":
  - If the rule is **general** (applies to any TypeScript / React / CSS
    project), the rule belongs in this skill. Add it to the appropriate
    sub-checklist under
    `skills/avandar-code-review/docs/code-reviews/` and update the phase
    list in this file if it warrants a new phase.
  - If the rule is **library-specific** (tied to one of the
    `@avandar/*` packages or another installable package), add it to the
    matching file under `docs/code-reviews/libraries/` in this skill, or
    create a new library-gated phase there.
  - If the rule is **repo-specific** (mentions paths or conventions
    unique to one codebase), add it to the repo-local
    `docs/code-reviews/extra-checklist.md`.
- When creating the repo-local file for the first time, use the packaged
  template from this skill as the starting structure.
