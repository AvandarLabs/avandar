# Atlas theme coverage: spec and implementation plan

**Status: done.** S1 to S9, the S1b token follow-up, and the cleanup pass have all merged into `chore/atlas-theme-coverage`. Every slice budget is empty and landed, and the guards cover every Atlas item. [The summary](README.md) describes the final state and the known exceptions.

This plan turns [the review](review.md) into work. Section 4 (new tokens), section 5 (toggleable options), section 6 (guards) and section 8 (slices) of the review are the spec. This file records the decisions, the order, and the rules every slice follows.

## Decisions

| Id | Question | Decision | Why |
| --- | --- | --- | --- |
| R9 | Do helper previews enter the video theme? | Yes. Helper previews render inside `GalleryItemTheme` and plot the theme's curves and durations. | The goal is that every Atlas item follows the theme. |
| R12 | How do `Demo`, `MotionLab`, `TitleStudy` follow the theme while keeping the starter palette intact? | A built-in `starter` theme reproduces `theme.css` exactly. These compositions default to it. | Keeps the upstream demo look (AGENTS.md) and removes the last literal palette. |
| R1 | oklch to hex for starter swatches | Measure each hex from a rendered pixel of today's output. | Theme colours are hex only. |
| R3 | `SceneShell` heading tracking | Give `sceneHeading` its own role. | Avoids a pixel change. |
| R4 | `color.onAccent` threshold | Keep 0.179 as the role's own threshold. | Avoids label colour flips. |
| R10 | Plan colours | Keep per-shot field colours as content, but let shot themes accept `$color.*` references and point the 121 colours at slate swatches. | Plans stay readable and theme-aware. |

Every new token defaults to today's literal, so `classic` output stays pixel-identical (verified by `pnpm theme:parity compare`), except where a risk row in the review says the change is intended.

## Order and ownership

1. **S1 Foundation** lands first on `chore/atlas-theme-coverage`. It alone edits shared theme files (see review section 8).
2. **S2 to S9** run in parallel, each in its own child worktree and branch `chore/atlas-theme-s<n>` based on the S1 result. Each owns a disjoint file set and its own budget file. A slice that needs a new token or a shared-file change reports it to the controller instead of editing shared files.
3. The controller merges each slice branch into `chore/atlas-theme-coverage` and resolves conflicts (expected only in docs).
4. A cleanup pass closes what the slices left open: the last pending tokens, the remaining token requests, hidden dash and opacity constants, the Helpers section and helper films, the stock palette's removal, and guards widened to every item.
5. Final branch review, then the full test, lint and parity run.

## Rules for every slice

- Red/green TDD where a test can express it. The guards from review section 6 are the tests: lower the slice budget file to zero.
- Capture `pnpm theme:parity capture --theme classic` for the slice ids before changing anything, then `pnpm theme:parity compare` after. Any pixel diff must be intended and listed in the report.
- Follow `AGENTS.md`, the repo `CLAUDE.md` (no em dashes, naming, comments describe current code), and `docs/rules/`.
- Run focused tests and type checks (`tsc -b --force` for types, oxfmt for format) inside the app. No full-suite runs concurrently in one worktree.
- Commit as you go with conventional commits. No push.
- Done means: budget file at zero, parity clean, tests and lint green for the owned paths, and a report listing changed files, new-token requests, and intended pixel changes.

## Review levels

| Work | Model, effort |
| --- | --- |
| Foundation and every slice implementer | opus, high |
| Per-slice review | opus, high |
| Final branch review | opus, xhigh |
