# 010 — Visualization Settings fieldsets

- **Slug**: `viz-settings-fieldsets`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-010/viz-settings-fieldsets`
- **Depends on**: `009-viz-multi-series-and-chart-types` (this row refines the **layout** of the fieldsets that #009 introduces). Can land before #009 in principle, but then this row will need a small fixup to use the refined layout primitives on top of the legacy single-key shape — leave it after.
- **Estimated PR size**: small — single-file order, ~1–3 fieldset reflow files, ~100–200 lines.

## Notes for future you

- This is a **layout refinement**, not new functionality. The fieldsets exist already (introduced by #009); this row groups them into labelled visual sections per the spec at `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`.
- Sole driver commit: `4e85af6`. Same SHA touches sql-pill rendering (#012) — when porting, split the diff: only the `VizSettingsForm*` part belongs here; the `AvaSqlBlock` part belongs to #012.
- This row will look like a no-op for the chart functionality QA. The verification is purely visual / layout — load the Data Explorer, open the Visualization Settings floating window (from row #008), and confirm the fieldsets are grouped + labelled per the design doc.

## What this feature is

The Visualization Settings panel (host: the floating window from row #008; content: the fieldsets introduced by row #009) gets re-grouped into labelled visual sections — e.g. "Axes" / "Series" / "Style" / "Legend" — matching the design doc. Field ordering, label wording, and spacing tighten up. No new controls; no new chart capability. Pure layout work.

Spec: `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md` (on `feat/ict4d-demo`). Driver commit: `4e85af6`.

## Steps to migrate

**Step 0** — `/deslop undrift viz-settings-fieldsets`.

1. Create the refactor branch off `develop`:
   ```sh
   git fetch origin develop
   git checkout -b refactor-010/viz-settings-fieldsets origin/develop
   ```
2. Confirm row #009 has merged into `develop`. If it hasn't, stop — this row's anchors don't exist yet.
3. Apply the layout-only changes from commit `4e85af6` (the `VizSettingsForm*` portion only — exclude the `AvaSqlBlock` portion which belongs to row #012).
4. Run verification.

### Files to copy verbatim

None — all changes are surgical edits to files that already exist on `develop` after #009 lands.

### Files to surgically edit on `develop`

- `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody.tsx`
  - Re-group fields into labelled fieldsets per the design doc (see commit `4e85af6` diff). Typical grouping: Axes (xKey/yKey/sizeKey), Series, Style (color, curve type), Legend, Layout.
- `src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.tsx`
  - Same fieldset reorg applied to the series-aware container.
- Any per-chart-type form file (`BarChartForm.tsx`, `LineChartForm.tsx`, etc.) that needs to opt into the new fieldset primitive.

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/VisualizationContainer/VizSettingsForm
```

### Manual

1. `pnpm dev`.
2. Open the Data Explorer. Open the Visualization Settings floating window.
3. For each chart type (bar, line, area, scatter, bubble, pie, funnel, radar), confirm the fields are visually grouped into the labelled sections from `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`.
4. Confirm spacing / typography matches the spec.
5. No behavioral regressions in the chart fieldsets themselves — every field still does what it did before.

## Risks + things to look out for

- **Commit `4e85af6` is a mixed commit** covering both fieldsets and SQL pills. Split carefully; if you pull the whole diff you'll accidentally migrate row #012's content too. Use `git show 4e85af6 -- src/components/VisualizationContainer/VizSettingsForm/` to scope.
- **Pure-CSS regressions on small viewports.** The fieldset grouping uses Mantine `<Fieldset>` (or equivalent); check that the floating-window narrow layout from row #008 doesn't clip the new section labels.

## How to mark this feature completed

When the operator runs `/deslop complete viz-settings-fieldsets`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-010/viz-settings-fieldsets origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-010/viz-settings-fieldsets 2>/dev/null || true`
   - `git push origin --delete refactor-010/viz-settings-fieldsets`
   - `rm docs/deslop/010-viz-settings-fieldsets.md`
   - Flip row #10 to `[x] ($MERGE_SHA)` in `ALL_FEATURES.md`.
   - Move the entry from `In-flight migrations` to `Completed migrations log` in `STATE.md`.
   - Commit `chore(deslop): mark viz-settings-fieldsets as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.
