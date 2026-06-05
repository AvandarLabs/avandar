# 046 — Recursive filter UI

- **Slug**: `recursive-filter-ui`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-046/recursive-filter-ui`
- **Depends on**: `045-structured-query-to-sql` (the renderer must understand the new shape).
- **Estimated PR size**: medium — 1 component + adapter + libs, ~500 lines.

## Notes for future you

- `react-querybuilder` + `@react-querybuilder/mantine` provide the UI; `QueryFilterGroup` is our library-agnostic intermediate shape so we can swap the lib later without rewriting callers.
- The shape is recursive: nested AND/OR groups. Don't flatten for the renderer — `structuredQueryToSql` walks the tree.

## What this feature is

`QueryFiltersField` — Mantine-styled nested AND/OR filter builder powered by `react-querybuilder` + `@react-querybuilder/mantine`. Local `QueryFilterGroup` shape is library-agnostic so we can swap the UI lib without touching callers.

## Steps to migrate

**Step 0** — `/deslop undrift recursive-filter-ui`.

1. Confirm #045 has merged.
2. Add `react-querybuilder` + `@react-querybuilder/mantine` deps.
3. Copy the component + adapter.

### Files to copy verbatim

```
src/views/DataExplorerApp/QueryForm/QueryFiltersField.tsx
src/lib/query/QueryFilterGroup.ts
src/lib/query/queryBuilderAdapter.ts
```

### Dependency changes

```
pnpm add react-querybuilder @react-querybuilder/mantine
```

## Verification

Manual: Data Explorer → add a WHERE clause with nested AND/OR → confirm SQL output and result.

## Risks + things to look out for

- **`react-doctor` flags `js-flatmap-filter` in `QueryFiltersField.tsx`** — preserve the pattern faithfully during port; the flatten optimization can be a follow-up.

## How to mark this feature completed

Standard ritual.
