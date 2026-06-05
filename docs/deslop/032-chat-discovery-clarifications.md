# 032 — Phase 2: discovery clarifications

- **Slug**: `chat-discovery-clarifications`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-032/chat-discovery-clarifications`
- **Depends on**: `028-privacy-isrowdatamessage-helper`, `030-chat-clarification-card-and-bias-check`.
- **Estimated PR size**: medium — ~6 files, +500 lines.

## Notes for future you

- Phase 2 introduces a NEW class of clarification: the model proposes a **read-only SELECT DISTINCT** query against the local DuckDB, the result populates a dropdown, the user picks a value, and that selection routes through `crossBoundary` (#025) with a `discovery_clarification` context tag.
- The `isReadOnlyDiscoveryQuery` validator is shared between client and server — both sides reject non-`SELECT DISTINCT` queries.

## What this feature is

The model can request a discovery query (read-only `SELECT DISTINCT`) to populate a clarification dropdown. The query runs locally in DuckDB (not in Supabase). The user's selection is then sent server-side via `crossBoundary` with the `discovery_clarification` context. This unblocks the LLM when it needs to know which concrete values a column contains before generating SQL.

## Steps to migrate

**Step 0** — `/deslop undrift chat-discovery-clarifications`.

1. Confirm #028 + #030 have merged.
2. Create the refactor branch.
3. Copy the validator + discovery clarification runner + new ClarificationCard variant.

### Files to copy verbatim

```
src/lib/chat/discovery/isReadOnlyDiscoveryQuery.ts
src/lib/chat/discovery/isReadOnlyDiscoveryQuery.test.ts
src/lib/chat/discovery/runDiscoveryQuery.ts
src/components/ChatPanel/clarification/DiscoveryDropdownVariant.tsx
supabase/functions/_shared/privacy/isReadOnlyDiscoveryQuery.ts (mirror of the client validator)
```

### Files to surgically edit on `develop`

- `ClarificationCard` — register the new discovery-dropdown variant.
- Chat edge function — accept `discovery_clarification` context on `crossBoundary` calls.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/chat/discovery
```

### Manual

1. `pnpm dev` + Supabase + a workspace with a dataset whose columns have categorical values.
2. Ask "show me revenue by region" without specifying a region. Confirm the model emits a discovery query; the dropdown populates with the actual regions in the dataset.
3. Pick a region — confirm SQL is generated with the chosen value.
4. Attempt to inject a non-`SELECT DISTINCT` query (e.g. via stubbed model output). Confirm both client and server reject.

## How to mark this feature completed

Standard ritual.
