# 021 — Better P-block generation

- **Slug**: `chat-better-pblock-generation`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-021/chat-better-pblock-generation`
- **Depends on**: `009-viz-multi-series-and-chart-types` (this row teaches the P-block generator about the expanded chart-type suite).
- **Estimated PR size**: small — ~3–5 files, ~150–250 lines.

## Notes for future you

- Driver commits: `c3e63d6`, `a01db18`. Commit `a01db18` is also the SQL-pill dropdown widening (#012) — scope to the P-block portion only.
- "P-block" = a Puck-page block (dashboard editor block). The generator produces a fully-populated DataViz block from a user's natural-language request, hydrating the chart type, axes, series, and any chart-style settings.

## What this feature is

Improvements to the AI-driven dashboard-block generator (`buildPendingDataVizBlock` and friends):

- Better column resolution from natural language.
- Smarter chart-type heuristics — knows about pie, funnel, radar, area, bubble (after #009 lands).
- Defaults that don't immediately need user adjustment (sensible axis assignments, color, legend toggle).

## Steps to migrate

**Step 0** — `/deslop undrift chat-better-pblock-generation`.

1. Confirm #009 has merged into `develop` (the expanded chart types must exist before the generator can target them).
2. Create the refactor branch off `develop`.
3. Surgically edit the P-block generator and any system-prompt context that informs it.
4. Run verification.

### Files to copy verbatim

None typically — surgical.

### Files to surgically edit on `develop`

- The P-block generator(s) — likely `src/components/ChatPanel/dashboards/buildPendingDataVizBlock.ts` and / or a server-side counterpart in `supabase/functions/chat/`.
- The system prompt that describes available chart types (must include pie/funnel/radar/area/bubble post-#009).

### Files to delete

None.

### Dependency changes

None.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/components/ChatPanel/dashboards supabase/functions/chat
```

### Manual

1. `pnpm dev` + Supabase stack.
2. Open a dashboard. Open the chat panel.
3. Ask "Add a pie chart of revenue by region". Confirm the generator produces a pie chart with sensible defaults (nameKey = region, valueKey = revenue).
4. Repeat for each new chart type. Confirm none collapse to "bar chart" defaults.

## Risks + things to look out for

- **Coupling to #009's series-array shape.** The generator must produce v3-shape configs (with `series` arrays), not v2-shape (`yAxisKey`). If it produces v2-shape, the `AvaPageDataMigrationV3` from #009 will rewrite it — slow but correct. Still, fix the generator to produce v3-shape natively.

## How to mark this feature completed

Standard ritual.
